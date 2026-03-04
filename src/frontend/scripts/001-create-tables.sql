-- La Cuchara - Database Schema for Azure SQL Database
-- Run this script against your Azure SQL instance

-- Usuarios table (shared login for hosteleros and clientes)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Usuarios')
CREATE TABLE Usuarios (
  IDUsuario INT IDENTITY(1,1) PRIMARY KEY,
  NombreUsuario NVARCHAR(100) UNIQUE NOT NULL,
  Contraseña NVARCHAR(255) NOT NULL,
  Rol NVARCHAR(20) NOT NULL CHECK (Rol IN ('cliente', 'hostelero')),
  FechaCreacion DATETIME DEFAULT GETDATE()
);

-- Restaurantes table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Restaurantes')
CREATE TABLE Restaurantes (
  IDRestaurante INT IDENTITY(1,1) PRIMARY KEY,
  IDHostelero INT NOT NULL FOREIGN KEY REFERENCES Usuarios(IDUsuario),
  NombreRestaurante NVARCHAR(200) NOT NULL,
  Direccion NVARCHAR(300),
  Descripcion NVARCHAR(500),
  ImagenURL NVARCHAR(500)
);

-- Menus table (daily menus)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Menus')
CREATE TABLE Menus (
  IDMenu INT IDENTITY(1,1) PRIMARY KEY,
  IDRestaurante INT NOT NULL FOREIGN KEY REFERENCES Restaurantes(IDRestaurante),
  Fecha DATE NOT NULL,
  Precio DECIMAL(6,2) NOT NULL,
  ImagenMenu NVARCHAR(MAX),
  FechaCreacion DATETIME DEFAULT GETDATE()
);

-- Platos table (dishes extracted from menu)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Platos')
CREATE TABLE Platos (
  IDPlato INT IDENTITY(1,1) PRIMARY KEY,
  IDMenu INT NOT NULL FOREIGN KEY REFERENCES Menus(IDMenu),
  Nombre NVARCHAR(200) NOT NULL,
  Tipo NVARCHAR(50) NOT NULL CHECK (Tipo IN ('primero', 'segundo', 'postre', 'bebida', 'otro')),
  Descripcion NVARCHAR(150)
);

-- Valoraciones table (ratings from clientes)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Valoraciones')
CREATE TABLE Valoraciones (
  IDValoracion INT IDENTITY(1,1) PRIMARY KEY,
  IDPlato INT NOT NULL FOREIGN KEY REFERENCES Platos(IDPlato),
  IDCliente INT NOT NULL FOREIGN KEY REFERENCES Usuarios(IDUsuario),
  Puntuacion INT NOT NULL CHECK (Puntuacion BETWEEN 1 AND 5),
  Comentario NVARCHAR(150),
  FechaValoracion DATETIME DEFAULT GETDATE()
);
