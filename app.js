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

    const proyectosConEmpleados = [];
    let pendientes = proyectos.length;

    if (pendientes === 0) {
      return res.render('proyects', {
        titulo: 'Dashboard de Proyectos',
        proyectos: proyectosConEmpleados
      });
    }

    proyectos.forEach((proyecto) => {
      dbhr.all('SELECT e.* FROM empleados e INNER JOIN proyecto_empleado pe ON e.id = pe.empleado_id WHERE pe.proyecto_id = ?', [proyecto.id], (err, empleados) => {
        if (err) {
          console.error('Error al obtener empleados del proyecto:', err.message);
          empleados = [];
        }

        proyectosConEmpleados.push({
          ...proyecto,
          empleados
        });

        pendientes--;

        if (pendientes === 0) {
          res.render('proyects', {
            titulo: 'Dashboard de Proyectos',
            proyectos: proyectosConEmpleados
          });
        }
      });
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

// Ruta para editar un proyecto (obtener datos desde la base de datos)
app.get('/proyectos/editar/:id', requireLogin, (req, res) => {
  const { id } = req.params;

  dbhr.get('SELECT * FROM proyectos WHERE id = ?', [id], (err, proyecto) => {
    if (err || !proyecto) {
      console.error('Error al obtener proyecto:', err ? err.message : 'Proyecto no encontrado');
      return res.redirect('/proyectos');
    }

    dbhr.all('SELECT * FROM empleados', (err, empleados) => {
      if (err) {
        console.error('Error al obtener empleados:', err.message);
        return res.redirect('/proyectos');
      }

      dbhr.all('SELECT empleado_id FROM proyecto_empleado WHERE proyecto_id = ?', [id], (err, asignados) => {
        if (err) {
          console.error('Error al obtener empleados asignados:', err.message);
          return res.redirect('/proyectos');
        }

        const empleadosAsignados = asignados.map(a => a.empleado_id);

        res.render('edit-proyect', {
          proyecto,
          empleados,
          empleados_asignados: empleadosAsignados
        });
      });
    });
  });
});

// Ruta para guardar los cambios de un proyecto
app.post('/editar-proyecto/:id', requireLogin, (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, presupuesto, fecha_entrega, empleados } = req.body;

  dbhr.run(`
    UPDATE proyectos
    SET nombre = ?, descripcion = ?, presupuesto = ?, fecha_entrega = ?
    WHERE id = ?
  `, [nombre, descripcion, presupuesto, fecha_entrega, id], (err) => {
    if (err) {
      console.error('Error al actualizar proyecto:', err.message);
      return res.redirect('/proyectos');
    }

    dbhr.run('DELETE FROM proyecto_empleado WHERE proyecto_id = ?', [id], (err) => {
      if (err) {
        console.error('Error al limpiar empleados asignados:', err.message);
        return res.redirect('/proyectos');
      }

      if (!empleados) return res.redirect('/proyectos');

      const empleadosArray = Array.isArray(empleados) ? empleados : [empleados];
      const stmt = dbhr.prepare(`
        INSERT INTO proyecto_empleado (proyecto_id, empleado_id) VALUES (?, ?)
      `);

      for (let empId of empleadosArray) {
        stmt.run(id, empId);
      }

      stmt.finalize();
      res.redirect('/proyectos');
    });
  });
});

//Ruta para mostrar proyectos en papelera
app.get('/proyectos/papelera', requireLogin, (req, res) => {
  dbhr.all('SELECT * FROM proyectos WHERE papelera = 1', (err, proyectos) => {
    if (err) {
      console.error('Error al obtener proyectos de la papelera:', err.message);
      return res.send('Error al cargar proyectos de la papelera');
    }

    const proyectosConEmpleados = [];
    let pendientes = proyectos.length;

    if (pendientes === 0) {
      return res.render('papelera', {
        titulo: 'Papelera de Proyectos',
        proyectos: proyectosConEmpleados
      });
    }

    proyectos.forEach((proyecto) => {
      dbhr.all('SELECT e.* FROM empleados e INNER JOIN proyecto_empleado pe ON e.id = pe.empleado_id WHERE pe.proyecto_id = ?', [proyecto.id], (err, empleados) => {
        if (err) {
          console.error('Error al obtener empleados del proyecto:', err.message);
          empleados = [];
        }

        proyectosConEmpleados.push({
          ...proyecto,
          empleados
        });

        pendientes--;

        if (pendientes === 0) {
          res.render('papelera', {
            titulo: 'Papelera de Proyectos',
            proyectos: proyectosConEmpleados
          });
        }
      });
    });
  });
});

// Ruta para eliminar un proyecto (mover a papelera)
app.get('/proyectos/papelera/:id', requireLogin, (req, res) => {
  const { id } = req.params;

  dbhr.get('SELECT papelera FROM proyectos WHERE id = ?', [id], (err, row) => {
    if (err || !row) {
      console.error('Error al obtener estado de papelera:', err ? err.message : 'Proyecto no encontrado');
      return res.redirect('/proyectos');
    }

    const papelera = row.papelera;

    if (papelera === 0) {
      dbhr.run('UPDATE proyectos SET papelera = 1 WHERE id = ?', [id], (err) => {
        if (err) {
          console.error('Error al mover proyecto a papelera:', err.message);
        }
        res.redirect('/proyectos');
      });
    } else if (papelera === 1) {
      dbhr.run('UPDATE proyectos SET papelera = 0 WHERE id = ?', [id], (err) => {
        if (err) {
          console.error('Error al restaurar proyecto de papelera:', err.message);
        }
        res.redirect('/proyectos');
      });
    }
  });
});

//Ruta para vacaiones
app.get('/vacaciones', requireLogin, (req, res) => {
  const query = `
    SELECT 
      v.id AS id_vacacion,
      e.id AS id_empleado,
      e.nombre AS empleado_nombre,
      v.fechaInVaca AS inicio,
      v.fechaFinVaca AS fin,
      v.estado
    FROM vacaciones v
    INNER JOIN empleados e ON e.id = v.id_empleado
  `;

  dbhr.all(query, (err, vacaciones) => {
    if (err) {
      console.error('Error al obtener vacaciones:', err.message);
      return res.send('Error al cargar vacaciones');
    }

    res.render('vacaciones', {
      titulo: 'Dashboard de Vacaciones',
      vacaciones
    });
  });
});

// Ruta para vacaciones aceptadas
app.get('/vacaciones_acept', requireLogin, (req, res) => {
  const query = `
    SELECT 
      e.id AS id_empleado,
      e.nombre AS empleado_nombre,
      v.fechaInVaca AS inicio,
      v.fechaFinVaca AS fin,
      v.estado
    FROM vacaciones v
    INNER JOIN empleados e ON e.id = v.id_empleado
    WHERE v.estado = 2
  `;

  dbhr.all(query, (err, vacaciones) => {
    if (err) {
      console.error('Error al obtener vacaciones aceptadas:', err.message);
      return res.send('Error al cargar vacaciones aceptadas');
    }

    res.render('vacaciones_acept', {
      titulo: 'Vacaciones Aceptadas',
      vacaciones
    });
  });
});

// Ruta para vacaciones denegadas
app.get('/vacaciones_deneg', requireLogin, (req, res) => {
  const query = `
    SELECT 
      e.id AS id_empleado,
      e.nombre AS empleado_nombre,
      v.fechaInVaca AS inicio,
      v.fechaFinVaca AS fin,
      v.estado
    FROM vacaciones v
    INNER JOIN empleados e ON e.id = v.id_empleado
    WHERE v.estado = 3
  `;

  dbhr.all(query, (err, vacaciones) => {
    if (err) {
      console.error('Error al obtener vacaciones denegadas:', err.message);
      return res.send('Error al cargar vacaciones denegadas');
    }

    res.render('vacaciones_deneg', {
      titulo: 'Vacaciones Denegadas',
      vacaciones
    });
  });
});

// Ruta para aceptar vacaciones (cambiar estado a 2)
app.post('/vacaciones/aceptar/:id', requireLogin, (req, res) => {
  const { id } = req.params;

  dbhr.run('UPDATE vacaciones SET estado = 2 WHERE id = ?', [id], (err) => {
    if (err) {
      console.error('Error al aceptar vacaciones:', err.message);
      return res.send('Error al actualizar el estado de las vacaciones.');
    }
    res.redirect('/vacaciones');
  });
});

// Ruta para denegar vacaciones (cambiar estado a 3)
app.post('/vacaciones/denegar/:id', requireLogin, (req, res) => {
  const { id } = req.params;

  dbhr.run('UPDATE vacaciones SET estado = 3 WHERE id = ?', [id], (err) => {
    if (err) {
      console.error('Error al denegar vacaciones:', err.message);
      return res.send('Error al actualizar el estado de las vacaciones.');
    }
    res.redirect('/vacaciones');
  });
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