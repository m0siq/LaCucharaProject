import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"
import { query, sql } from "@/lib/db"

export async function POST(request: Request) {
  try {
    await requireRole("hostelero")
    const { image, menuId } = await request.json()

    if (!image || !menuId) {
      return NextResponse.json(
        { error: "Imagen y menuId son obligatorios" },
        { status: 400 }
      )
    }

    const endpoint = process.env.AZURE_DI_ENDPOINT
    const key = process.env.AZURE_DI_KEY

    if (!endpoint || !key) {
      return NextResponse.json(
        {
          error:
            "Azure Document Intelligence no esta configurado. Configura AZURE_DI_ENDPOINT y AZURE_DI_KEY para usar OCR. Mientras tanto, anade los platos manualmente.",
          platosCreados: 0,
        },
        { status: 400 }
      )
    }

    // Extract base64 data from data URL
    let base64Data = image
    if (image.startsWith("data:")) {
      base64Data = image.split(",")[1]
    }

    // Call Azure Document Intelligence Layout API
    const analyzeUrl = `${endpoint}/documentintelligence/documentModels/prebuilt-layout:analyze?api-version=2024-11-30`

    const analyzeResponse = await fetch(analyzeUrl, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        base64Source: base64Data,
      }),
    })

    if (!analyzeResponse.ok) {
      const errorText = await analyzeResponse.text()
      console.error("Azure DI error:", errorText)
      return NextResponse.json(
        { error: "Error al procesar la imagen con Azure Document Intelligence" },
        { status: 500 }
      )
    }

    // Get the operation-location header for polling
    const operationLocation = analyzeResponse.headers.get("operation-location")
    if (!operationLocation) {
      return NextResponse.json(
        { error: "No se recibio la URL de resultado de Azure" },
        { status: 500 }
      )
    }

    // Poll for results
    let result = null
    for (let i = 0; i < 30; i++) {
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const pollResponse = await fetch(operationLocation, {
        headers: { "Ocp-Apim-Subscription-Key": key },
      })

      const pollData = await pollResponse.json()

      if (pollData.status === "succeeded") {
        result = pollData.analyzeResult
        break
      } else if (pollData.status === "failed") {
        return NextResponse.json(
          { error: "El analisis de la imagen fallo" },
          { status: 500 }
        )
      }
    }

    if (!result) {
      return NextResponse.json(
        { error: "Timeout al analizar la imagen" },
        { status: 504 }
      )
    }

    // Extract text content and try to parse dishes
    const lines: string[] = []
    if (result.content) {
      lines.push(
        ...result.content
          .split("\n")
          .map((l: string) => l.trim())
          .filter((l: string) => l.length > 0)
      )
    }

    // Simple heuristic: each non-empty line is potentially a dish name
    // Filter out very short lines and price-like patterns
    const dishLines = lines.filter((line: string) => {
      const isPriceLine = /^\d+[\.,]\d{2}\s*€?$/.test(line)
      const isHeaderLine = /^(menu|precio|iva|total|postre|primero|segundo|bebida)/i.test(line)
      return line.length > 3 && !isPriceLine && !isHeaderLine
    })

    // Categorize dishes (simple heuristic)
    let platosCreados = 0
    for (let i = 0; i < dishLines.length; i++) {
      let tipo = "otro"
      const lower = dishLines[i].toLowerCase()

      // Simple categorization heuristics
      if (
        lower.includes("sopa") ||
        lower.includes("ensalada") ||
        lower.includes("gazpacho") ||
        lower.includes("crema") ||
        lower.includes("arroz") ||
        lower.includes("pasta") ||
        lower.includes("macarr")
      ) {
        tipo = "primero"
      } else if (
        lower.includes("carne") ||
        lower.includes("pollo") ||
        lower.includes("pescado") ||
        lower.includes("filete") ||
        lower.includes("lomo") ||
        lower.includes("merluza") ||
        lower.includes("ternera") ||
        lower.includes("cerdo")
      ) {
        tipo = "segundo"
      } else if (
        lower.includes("flan") ||
        lower.includes("tarta") ||
        lower.includes("helado") ||
        lower.includes("fruta") ||
        lower.includes("natillas") ||
        lower.includes("yogur")
      ) {
        tipo = "postre"
      } else if (
        lower.includes("agua") ||
        lower.includes("vino") ||
        lower.includes("cerveza") ||
        lower.includes("refresco") ||
        lower.includes("cafe")
      ) {
        tipo = "bebida"
      } else if (i < dishLines.length * 0.4) {
        tipo = "primero"
      } else if (i < dishLines.length * 0.7) {
        tipo = "segundo"
      } else {
        tipo = "postre"
      }

      await query(
        `INSERT INTO Platos (IDMenu, Nombre, Tipo, Descripcion)
         VALUES (@menuId, @nombre, @tipo, NULL)`,
        [
          { name: "menuId", type: sql.Int, value: menuId },
          { name: "nombre", type: sql.NVarChar, value: dishLines[i].substring(0, 200) },
          { name: "tipo", type: sql.NVarChar, value: tipo },
        ]
      )
      platosCreados++
    }

    return NextResponse.json({
      platosCreados,
      message: `Se extrajeron ${platosCreados} platos de la imagen`,
    })
  } catch (error: unknown) {
    console.error("OCR error:", error)
    return NextResponse.json(
      { error: "Error al procesar OCR" },
      { status: 500 }
    )
  }
}
