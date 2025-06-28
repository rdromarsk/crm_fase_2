-- Criar tabela de roles
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir roles padrão
INSERT INTO roles (name, description, permissions) VALUES 
('admin', 'Administrador do sistema', '{"all": true}'),
('lawyer', 'Advogado', '{"clients": true, "cases": true, "juridico": true}'),
('assistant', 'Assistente jurídico', '{"clients": true, "tasks": true}');

-- Adicionar coluna role_id na tabela users
ALTER TABLE users ADD COLUMN role_id INTEGER REFERENCES roles(id);

-- Migrar dados existentes
UPDATE users SET role_id = (
    SELECT id FROM roles WHERE name = users.role
);

-- Remover coluna role antiga após confirmação
-- ALTER TABLE users DROP COLUMN role;
