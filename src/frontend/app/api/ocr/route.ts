import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    await requireRole("hostelero")
    const { image, menuId } = await request.json()

    // Mostrar el JSON recibido
    console.log("\n" + "=".repeat(60))
    console.log("📨 [OCR] JSON RECIBIDO:")
    console.log("=".repeat(60))
    console.log({
      menuId,
      imagen_size: image ? image.length : 0,
      imagen_primeros_50_chars: image ? image.substring(0, 50) + "..." : null,
    })
    console.log("=".repeat(60) + "\n")

    console.log("🔍 [OCR] Iniciando OCR para menuId:", menuId)

    if (!image || !menuId) {
      console.error("❌ [OCR] Falta imagen o menuId")
      return NextResponse.json(
        { error: "Imagen y menuId son obligatorios" },
        { status: 400 }
      )
    }

    const endpoint = process.env.AZURE_DI_ENDPOINT
    const key = process.env.AZURE_DI_KEY

    console.log("🔧 [OCR] Endpoint Azure:", endpoint)
    console.log("🔑 [OCR] Key configurada:", !!key)

    if (!endpoint || !key) {
      console.error("❌ [OCR] Azure Document Intelligence no configurado")
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

    console.log("📸 [OCR] Imagen base64 tamaño:", base64Data.length, "bytes")

    // Call Azure Document Intelligence with custom model
    const analyzeUrl = `${endpoint}/documentintelligence/documentModels/ReconocimientoCartas:analyze?api-version=2024-11-30`

    console.log("🌐 [OCR] Enviando a Azure modelo personalizado:", analyzeUrl)

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
      console.error("❌ [OCR] Azure DI error:", errorText)
      return NextResponse.json(
        { error: "Error al procesar la imagen con Azure Document Intelligence" },
        { status: 500 }
      )
    }

    // Get the operation-location header for polling
    const operationLocation = analyzeResponse.headers.get("operation-location")
    console.log("⏳ [OCR] Operation Location:", operationLocation)
    
    if (!operationLocation) {
      console.error("❌ [OCR] No se recibió operation-location")
      return NextResponse.json(
        { error: "No se recibio la URL de resultado de Azure" },
        { status: 500 }
      )
    }

    // Poll for results
    let result = null
    for (let i = 0; i < 30; i++) {
      console.log(`🔄 [OCR] Polling intento ${i + 1}/30...`)
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const pollResponse = await fetch(operationLocation, {
        headers: { "Ocp-Apim-Subscription-Key": key },
      })

      const pollData = await pollResponse.json()

      if (pollData.status === "succeeded") {
        console.log("✅ [OCR] Análisis completado con éxito")
        result = pollData.analyzeResult
        break
      } else if (pollData.status === "failed") {
        console.error("❌ [OCR] El análisis de la imagen falló")
        return NextResponse.json(
          { error: "El analisis de la imagen fallo" },
          { status: 500 }
        )
      }
    }

    if (!result) {
      console.error("❌ [OCR] Timeout al analizar la imagen (30 intentos)")
      return NextResponse.json(
        { error: "Timeout al analizar la imagen" },
        { status: 504 }
      )
    }

    // Extract entities from custom model ReconocimientoCartas
    const platosPorTipo: { Primer_plato: string[]; Segundo_plato: string[]; Postres: string[] } = {
      Primer_plato: [],
      Segundo_plato: [],
      Postres: [],
    }

    if (result.documents && result.documents.length > 0) {
      const doc = result.documents[0]
      const fields = doc.fields || {}

      console.log("\n📊 [OCR] Campos extraídos del modelo personalizado:")
      console.log(JSON.stringify(fields, null, 2))

      // Extraer Primer_plato del modelo personalizado
      if (fields.Primer_plato && fields.Primer_plato.content) {
        const primerPlatoText = fields.Primer_plato.content
        console.log("\n📌 [OCR] Text de PRIMER_PLATO:", primerPlatoText)
        const primeros = primerPlatoText
          .split(/[\n•-]/)
          .map((p: string) => p.trim())
          .filter((p: string) => p.length > 2)
        platosPorTipo.Primer_plato = primeros
        console.log("✅ [OCR] Primer_plato extraído:", platosPorTipo.Primer_plato)
      } else {
        console.log("⚠️  [OCR] Campo Primer_plato no encontrado en el modelo")
      }

      // Extraer Segundo_plato del modelo personalizado
      if (fields.Segundo_plato && fields.Segundo_plato.content) {
        const segundoPlatoText = fields.Segundo_plato.content
        console.log("\n🍖 [OCR] Text de SEGUNDO_PLATO:", segundoPlatoText)
        const segundos = segundoPlatoText
          .split(/[\n•-]/)
          .map((p: string) => p.trim())
          .filter((p: string) => p.length > 2)
        platosPorTipo.Segundo_plato = segundos
        console.log("✅ [OCR] Segundo_plato extraído:", platosPorTipo.Segundo_plato)
      } else {
        console.log("⚠️  [OCR] Campo Segundo_plato no encontrado en el modelo")
      }

      // Extraer Postres del modelo personalizado
      if (fields.Postres && fields.Postres.content) {
        const postresText = fields.Postres.content
        console.log("\n🍰 [OCR] Text de POSTRES:", postresText)
        const postres = postresText
          .split(/[\n•-]/)
          .map((p: string) => p.trim())
          .filter((p: string) => p.length > 2)
        platosPorTipo.Postres = postres
        console.log("✅ [OCR] Postres extraído:", platosPorTipo.Postres)
      } else {
        console.log("⚠️  [OCR] Campo Postres no encontrado en el modelo")
      }
    } else {
      console.error("❌ [OCR] No se encontraron documentos en el resultado de Azure")
    }

    // Mostrar solo Primer_plato, Segundo_plato y Postres
    console.log("\n" + "=".repeat(60))
    console.log("🍽️  RESULTADOS DE EXTRACCIÓN OCR")
    console.log("=".repeat(60))
    
    console.log("\n📌 PRIMER_PLATO:")
    if (platosPorTipo.Primer_plato.length === 0) {
      console.log("  ❌ No se encontraron")
    } else {
      platosPorTipo.Primer_plato.forEach((plato, idx) => {
        console.log(`  ${idx + 1}. ${plato}`)
      })
    }

    console.log("\n🍖 SEGUNDO_PLATO:")
    if (platosPorTipo.Segundo_plato.length === 0) {
      console.log("  ❌ No se encontraron")
    } else {
      platosPorTipo.Segundo_plato.forEach((plato, idx) => {
        console.log(`  ${idx + 1}. ${plato}`)
      })
    }

    console.log("\n🍰 POSTRES:")
    if (platosPorTipo.Postres.length === 0) {
      console.log("  ❌ No se encontraron")
    } else {
      platosPorTipo.Postres.forEach((plato, idx) => {
        console.log(`  ${idx + 1}. ${plato}`)
      })
    }

    console.log("\n" + "=".repeat(60))
    console.log(`✅ Total de platos extraídos: ${platosPorTipo.Primer_plato.length + platosPorTipo.Segundo_plato.length + platosPorTipo.Postres.length}`)
    console.log("=".repeat(60) + "\n")

    console.log("\n" + "=".repeat(60))
    console.log("✅ [OCR] JSON DE RESPUESTA:")
    console.log("=".repeat(60))
    const respuesta = {
      Primer_plato: platosPorTipo.Primer_plato,
      Segundo_plato: platosPorTipo.Segundo_plato,
      Postres: platosPorTipo.Postres,
      message: `OCR completado. Revisa la terminal para ver los resultados.`,
    }
    console.log(respuesta)
    console.log("=".repeat(60) + "\n")

    // Send extracted dishes to backend to save to database
    console.log("📤 [OCR] Enviando platos al backend para guardar en BD...")
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    const saveResponse = await fetch(`${backendUrl}/platos/ocr/procesar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        menuId: menuId,
        Primer_plato: platosPorTipo.Primer_plato,
        Segundo_plato: platosPorTipo.Segundo_plato,
        Postres: platosPorTipo.Postres,
      }),
    })

    if (!saveResponse.ok) {
      const errorText = await saveResponse.text()
      console.error("❌ [OCR] Backend error:", errorText)
      // Continue anyway, the OCR extraction succeeded even if DB save failed
      console.log("⚠️  [OCR] OCR extraído pero error al guardar en BD")
    } else {
      const saveResult = await saveResponse.json()
      console.log("\n✅ [BD] Respuesta del backend:")
      console.log("=".repeat(60))
      console.log(saveResult)
      console.log("=".repeat(60) + "\n")
      respuesta.message = saveResult.mensaje
    }

    return NextResponse.json(respuesta)
  } catch (error: unknown) {
    console.error("💥 [OCR] Error al procesar OCR:", error)
    if (error instanceof Error) {
      console.error("💥 [OCR] Error message:", error.message)
      console.error("💥 [OCR] Stack:", error.stack)
    }
    return NextResponse.json(
      { error: "Error al procesar OCR" },
      { status: 500 }
    )
  }
}
