const jwt = require("jsonwebtoken");
const { Pool } = require('pg');

// Configuração do banco de dados
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'crm_advocacia',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

// Middleware de autenticação básica
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token de acesso requerido' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'secret_key', (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Token inválido' });
      }
      req.user = user;
      next();
    });
  } catch (error) {
    res.status(401).json({ error: 'Erro de autenticação' });
  }
};

// Middleware de autorização baseada em roles
const authorizeRoles = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Buscar informações do usuário e role no banco
      const query = `
        SELECT u.*, r.name as role_name, r.permissions
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.id = $1
      `;
      
      const result = await pool.query(query, [req.user.id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const userData = result.rows[0];
      
      // Verificar se o role do usuário está entre os permitidos
      const userRole = userData.role_name || userData.role || 'user';
      
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ 
          error: 'Acesso negado. Permissões insuficientes.',
          required_roles: allowedRoles,
          user_role: userRole
        });
      }

      // Adicionar informações de role ao request
      req.user.role = userRole;
      req.user.permissions = userData.permissions || {};
      
      next();
    } catch (error) {
      console.error('Erro na autorização:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };
};

// Middleware para verificar permissões específicas
const checkPermission = (permission) => {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.permissions) {
        return res.status(403).json({ error: 'Permissões não definidas' });
      }

      const permissions = req.user.permissions;
      
      // Se tem permissão total (admin)
      if (permissions.all === true) {
        return next();
      }

      // Verificar permissão específica
      const hasPermission = permission.split('.').reduce((obj, key) => {
        return obj && obj[key];
      }, permissions);

      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Permissão insuficiente',
          required_permission: permission
        });
      }

      next();
    } catch (error) {
      console.error('Erro na verificação de permissão:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };
};

// Middleware para verificar se o usuário pode acessar um processo específico
const checkProcessAccess = async (req, res, next) => {
  try {
    const processoId = req.params.processoId || req.params.id;
    const userId = req.user.id;

    if (!processoId) {
      return res.status(400).json({ error: 'ID do processo não fornecido' });
    }

    // Verificar se o usuário tem acesso ao processo
    const query = `
      SELECT 1 FROM processos p
      WHERE p.id = $1 AND (
        p.advogado_id = $2 OR
        EXISTS (SELECT 1 FROM processo_users pu WHERE pu.processo_id = $1 AND pu.user_id = $2)
      )
    `;

    const result = await pool.query(query, [processoId, userId]);

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'Acesso negado ao processo' });
    }

    next();
  } catch (error) {
    console.error('Erro na verificação de acesso ao processo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  checkPermission,
  checkProcessAccess,
  // Manter compatibilidade com o código existente
  auth: authenticateToken
};


