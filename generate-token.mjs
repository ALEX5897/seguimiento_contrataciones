import jwt from 'jsonwebtoken';

const JWT_SECRET = 'cambiar-este-secreto-en-produccion';

const usuario = {
  id: 1,
  username: 'test',
  role: 'admin',
  direccionNombre: 'Test Direction'
};

const token = jwt.sign(usuario, JWT_SECRET, { expiresIn: '8h' });
console.log(token);
