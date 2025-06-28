-- Inserir o usuário Admin
INSERT INTO users (name, email, password_hash, role_id) VALUES
('Admin', 'man@crmadv.com', '123456', (SELECT id FROM roles WHERE name = 'admin'));

-- Inserir o advogado Allisson
INSERT INTO users (name, email, password_hash, role_id) VALUES
('Allisson', 'allissonlevi1@gmail.com', '123456', (SELECT id FROM roles WHERE name = 'lawyer'));

-- Inserir a advogada Ticiana
INSERT INTO users (name, email, password_hash, role_id) VALUES
('Ticiana', 'tici@gmail.com', '123456', (SELECT id FROM roles WHERE name = 'lawyer'));

-- Nota: As senhas '123456' são placeholders. Em um ambiente de produção, use senhas hashed.

