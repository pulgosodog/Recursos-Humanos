const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Conexión a la base de datos RH.db
const dbPath = path.join(__dirname, 'RH.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar con la base de datos:', err.message);
  } else {
    console.log('Conectado a la base de datos RH.db');
  }
});

// Agregar la columna 'papelera' a la tabla 'proyectos'
db.run(`ALTER TABLE proyectos
         ADD COLUMN papelera INTEGER DEFAULT 0`, (err) => {
  if (err) {
    console.error('Error al agregar la columna:', err.message);
    return;
  }
  console.log('Columna "papelera" agregada con éxito');
});

// Crear tabla vacaciones
db.run(`
  CREATE TABLE IF NOT EXISTS vacaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    id_empleado INTEGER NOT NULL,
    fechaInVaca TEXT NOT NULL,
    fechaFinVaca TEXT NOT NULL,
    estado INTEGER NOT NULL CHECK(estado IN (1, 2, 3)),
    FOREIGN KEY (id_empleado) REFERENCES empleados (id)
  )
`, (err) => {
  if (err) {
    console.error('Error al crear la tabla vacaciones:', err.message);
  } else {
    console.log('Tabla vacaciones creada exitosamente');
  }
});

// Insertar datos en la tabla vacaciones
const insertQuery = `
  INSERT INTO vacaciones (id_empleado, fechaInVaca, fechaFinVaca, estado)
  VALUES (?, ?, ?, ?)
`;

const vacaciones = [
  { id_empleado: 1, fechaInVaca: '2025-06-01', fechaFinVaca: '2025-06-10', estado: 1 },
  { id_empleado: 2, fechaInVaca: '2025-07-15', fechaFinVaca: '2025-07-20', estado: 2 },
  { id_empleado: 3, fechaInVaca: '2025-08-05', fechaFinVaca: '2025-08-12', estado: 3 },
  { id_empleado: 4, fechaInVaca: '2025-09-01', fechaFinVaca: '2025-09-07', estado: 1 },
  { id_empleado: 5, fechaInVaca: '2025-10-10', fechaFinVaca: '2025-10-17', estado: 2 }
];

vacaciones.forEach((v) => {
  db.run(insertQuery, [v.id_empleado, v.fechaInVaca, v.fechaFinVaca, v.estado], (err) => {
    if (err) {
      console.error('Error al insertar datos en la tabla vacaciones:', err.message);
    } else {
      console.log(`Vacaciones insertadas para id_empleado: ${v.id_empleado}`);
    }
  });
});

// Cerrar la conexión
db.close((err) => {
  if (err) {
    console.error('Error al cerrar la conexión con la base de datos:', err.message);
  } else {
    console.log('Conexión con la base de datos cerrada');
  }
});
