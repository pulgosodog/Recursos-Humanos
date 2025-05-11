const Database = require('better-sqlite3');
const db = new Database('database.sqlite');
const sqlite3 = require('sqlite3').verbose();

// Tabla de empleados
db.prepare(`
  CREATE TABLE IF NOT EXISTS empleados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    correo TEXT UNIQUE
  )
`).run();

// Tabla de proyectos
db.prepare(`
  CREATE TABLE IF NOT EXISTS proyectos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    fecha_inicio TEXT,
    fecha_entrega TEXT,
    estado TEXT DEFAULT 'activo',
    presupuesto REAL,
    papelera INTEGER DEFAULT 0
  )
`).run();

// Tabla intermedia para asignación
db.prepare(`
  CREATE TABLE IF NOT EXISTS proyecto_empleado (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proyecto_id INTEGER NOT NULL,
    empleado_id INTEGER NOT NULL,
    FOREIGN KEY(proyecto_id) REFERENCES proyectos(id),
    FOREIGN KEY(empleado_id) REFERENCES empleados(id)
  )
`).run();

// Historial de cambios
db.prepare(`
  CREATE TABLE IF NOT EXISTS historial_proyecto (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proyecto_id INTEGER NOT NULL,
    campo TEXT NOT NULL,
    valor_anterior TEXT,
    valor_nuevo TEXT,
    fecha_cambio TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(proyecto_id) REFERENCES proyectos(id)
  )
`).run();

// Presupuesto general (opcional)
db.prepare(`
  CREATE TABLE IF NOT EXISTS presupuesto_global (
    id INTEGER PRIMARY KEY,
    monto_total REAL
  )
`).run();

// Inicializa presupuesto si no existe
const row = db.prepare(`SELECT COUNT(*) AS total FROM presupuesto_global`).get();
if (row.total === 0) {
  db.prepare(`INSERT INTO presupuesto_global (id, monto_total) VALUES (1, 1000000.00)`).run();
}

console.log('Base de datos inicializada correctamente');
