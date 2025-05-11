const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Crear carpeta /db si no existe
const dbFolder = path.join(__dirname);
if (!fs.existsSync(dbFolder)) {
  fs.mkdirSync(dbFolder);
}

// Conectar a la base de datos RH.db
const dbPath = path.join(dbFolder, 'RH.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  // Crear tablas si no existen
  db.run(`
    CREATE TABLE IF NOT EXISTS empleados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      asistencia INTEGER NOT NULL CHECK(asistencia BETWEEN 1 AND 3),
      metricas INTEGER NOT NULL CHECK(metricas BETWEEN 1 AND 3),
      vacaciones_acumuladas INTEGER NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS proyectos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      presupuesto INTEGER NOT NULL,
      fecha_entrega TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS proyecto_empleado (
      proyecto_id INTEGER,
      empleado_id INTEGER,
      FOREIGN KEY (proyecto_id) REFERENCES proyectos(id),
      FOREIGN KEY (empleado_id) REFERENCES empleados(id)
    )
  `);

  // Verificar e insertar empleados si no hay
  db.get(`SELECT COUNT(*) as count FROM empleados`, (err, row) => {
    if (row.count === 0) {
      const empleados = [
        ['Juan Pérez', 2, 3, 5],
        ['Ana Martínez', 1, 2, 8],
        ['Carlos Gómez', 3, 1, 2],
        ['Laura Ruiz', 2, 2, 10],
        ['Sofía Díaz', 1, 3, 6],
        ['Pedro Castillo', 3, 2, 4],
        ['Lucía Torres', 2, 1, 7],
        ['Andrés Herrera', 1, 1, 9],
        ['Marina Bravo', 3, 3, 3],
        ['Esteban Ríos', 2, 2, 6]
      ];

      empleados.forEach(emp => {
        db.run(`
          INSERT INTO empleados (nombre, asistencia, metricas, vacaciones_acumuladas)
          VALUES (?, ?, ?, ?)
        `, emp);
      });
    }
  });

  // Verificar e insertar proyectos si no hay
  db.get(`SELECT COUNT(*) as count FROM proyectos`, (err, row) => {
    if (row.count === 0) {
      const proyectos = [
        ['Proyecto A', 'Migración de servidores', 15000, '2025-06-30'],
        ['Proyecto B', 'Aplicación móvil interna', 22000, '2025-07-15'],
        ['Proyecto C', 'Rediseño de sitio web', 18000, '2025-08-01'],
        ['Proyecto D', 'Implementación de ERP', 30000, '2025-09-10'],
        ['Proyecto E', 'Automatización de procesos', 25000, '2025-07-25']
      ];

      proyectos.forEach(p => {
        db.run(`
          INSERT INTO proyectos (nombre, descripcion, presupuesto, fecha_entrega)
          VALUES (?, ?, ?, ?)
        `, p);
      });
    }
  });
});

module.exports = db;
