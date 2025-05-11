const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');
const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));


// Configuración de sesión
app.use(session({
  secret: 'clave_secreta_segura',
  resave: false,
  saveUninitialized: false
}));

// Base de datos SQLite
const db = new sqlite3.Database('./usuarios.db');

function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

// Conexión a la base de datos RH.db
const dbhrPath = path.join(__dirname, 'RH.db');
const dbhr = new sqlite3.Database(dbhrPath, (err) => {
  if (err) {
    console.error('Error al abrir RH.db:', err.message);
  } else {
    console.log('Conectado a RH.db');
  }
});

// Crear tabla empleados
dbhr.run(`
  CREATE TABLE IF NOT EXISTS empleados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    asistencia INTEGER DEFAULT 3,
    metricas INTEGER DEFAULT 3,
    vacaciones INTEGER DEFAULT 0
  )
`);

// Insertar empleados si está vacía
dbhr.get('SELECT COUNT(*) AS total FROM empleados', (err, row) => {
  if (row && row.total === 0) {
    const stmt = dbhr.prepare(`
      INSERT INTO empleados (nombre, asistencia, metricas, vacaciones)
      VALUES (?, ?, ?, ?)
    `);

    const nombres = ['Ana', 'Luis', 'Carla', 'Pedro', 'Sofía'];
    for (let nombre of nombres) {
      stmt.run(nombre, Math.ceil(Math.random() * 3), Math.ceil(Math.random() * 3), Math.floor(Math.random() * 10));
    }

    stmt.finalize();
    console.log('Empleados insertados en RH.db');
  }
});

// Función para obtener empleados
function obtenerEmpleados(callback) {
  dbhr.all('SELECT * FROM empleados', (err, rows) => {
    if (err) {
      console.error('Error al obtener empleados:', err.message);
      callback([]);
    } else {
      callback(rows);
    }
  });
}


// Rutas

app.get('/', (req, res) => {
  if (req.session.user) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/login');
  }
  
});
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', (req, res) => {
  const { usuario, contrasena } = req.body;

  db.get('SELECT * FROM usuarios WHERE usuario = ?', [usuario], async (err, user) => {
    if (!user) {
      return res.render('login', { error: 'Usuario no encontrado' });
    }

    const valid = await bcrypt.compare(contrasena, user.contrasena);
    if (valid) {
      req.session.user = { id: user.id, usuario: user.usuario };
      res.redirect('/dashboard');
    } else {
      res.render('login', { error: 'Contraseña incorrecta' });
    }
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

app.get('/dashboard', requireLogin, (req, res) => { 
  res.render('dashboard', {
    titulo: 'Dashboard',
    usuario: req.session.user.usuario
  });
}
);

app.get('/proyectos', requireLogin, (req, res) => {
  dbhr.all('SELECT * FROM proyectos', (err, proyectos) => {
    if (err) {
      console.error('Error al obtener proyectos:', err.message);
      return res.send('Error al cargar proyectos');
    }

    res.render('proyects', {
      titulo: 'Dashboard de Proyectos',
      proyectos
    });
  });
});

app.get('/proyectos/agregar', (req, res) => {
  obtenerEmpleados((empleados) => {
    res.render('add-proyect', { empleados });
  });
});

app.post('/agregar-proyecto', (req, res) => {
  const { nombre, descripcion, presupuesto, fecha_entrega, empleados } = req.body;

  dbhr.run(`
    INSERT INTO proyectos (nombre, descripcion, presupuesto, fecha_entrega)
    VALUES (?, ?, ?, ?)
  `, [nombre, descripcion, presupuesto, fecha_entrega], function(err) {
    if (err) {
      console.error('Error al insertar proyecto:', err.message);
      return res.send('Error al guardar el proyecto.');
    }

    const proyectoId = this.lastID;

    if (!empleados) return res.redirect('/proyectos');

    const empleadosArray = Array.isArray(empleados) ? empleados : [empleados];
    const stmt = dbhr.prepare(`
      INSERT INTO proyecto_empleado (proyecto_id, empleado_id) VALUES (?, ?)
    `);

    for (let empId of empleadosArray) {
      stmt.run(proyectoId, empId);
    }

    stmt.finalize();
    res.redirect('/proyectos');
  });
});


app.get('/proyectos/editar/:id', (req, res) => {
  console.log("Targeteando ruta editar")
  const { id } = req.params;

  // Simulación de datos desde la base de datos
  const proyecto = {
    id,
    nombre: 'Proyecto X',
    descripcion: 'Descripción actual',
    presupuesto: 1500,
    fecha_entrega: '2025-05-30',
    empleados_asignados: [1, 3] // ids
  };

  const empleados = [
    { id: 1, nombre: 'Ana Pérez' },
    { id: 2, nombre: 'Luis Gómez' },
    { id: 3, nombre: 'Carla Díaz' }
  ];

  const historial = [
    { fecha: '2025-05-10', cambio: 'Se cambió la fecha de entrega' },
    { fecha: '2025-04-20', cambio: 'Se actualizó el presupuesto' }
  ];

  res.render('edit-proyect', { proyecto, empleados, historial });
});

app.post('/editar-proyecto/:id', (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, presupuesto, fecha_entrega, empleados } = req.body;

  // Aquí iría la lógica para actualizar en SQLite
  console.log('Proyecto actualizado:', {
    id,
    nombre,
    descripcion,
    presupuesto,
    fecha_entrega,
    empleados: Array.isArray(empleados) ? empleados : [empleados]
  });

  // Redirecciona de vuelta al dashboard o vista del proyecto
  res.redirect('/proyectos');
});



app.listen(port, () => {
  console.log(`Servidor en http://localhost:${port}`);
});

// Crear un usuario manual (una sola vez)
const crearUsuarioInicial = async () => {
  const usuario = 'admin';
  const contrasenaPlano = '1234';
  const hash = await bcrypt.hash(contrasenaPlano, 10);

  db.get('SELECT * FROM usuarios WHERE usuario = ?', [usuario], (err, row) => {
    if (!row) {
      db.run('INSERT INTO usuarios (usuario, contrasena) VALUES (?, ?)', [usuario, hash]);
      console.log('Usuario admin creado con contraseña 1234');
    }
  });
};

crearUsuarioInicial();