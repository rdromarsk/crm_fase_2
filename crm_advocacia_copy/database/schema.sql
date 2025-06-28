-- Modelo de Banco de Dados para CRM de Advocacia

-- Tabela de usuários (advogados, administradores, etc.)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'lawyer', -- 'admin', 'lawyer', 'assistant'
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de clientes
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    cpf_cnpj VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(10),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'prospect'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de casos/processos
CREATE TABLE cases (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    lawyer_id INTEGER REFERENCES users(id),
    case_number VARCHAR(100),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    case_type VARCHAR(100), -- 'civil', 'criminal', 'trabalhista', etc.
    status VARCHAR(50) DEFAULT 'open', -- 'open', 'closed', 'pending'
    court VARCHAR(255),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de agendamentos
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_datetime TIMESTAMP NOT NULL,
    end_datetime TIMESTAMP NOT NULL,
    location VARCHAR(255),
    client_id INTEGER REFERENCES clients(id),
    lawyer_id INTEGER REFERENCES users(id),
    case_id INTEGER REFERENCES cases(id),
    status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de tarefas
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE,
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
    assigned_to INTEGER REFERENCES users(id),
    client_id INTEGER REFERENCES clients(id),
    case_id INTEGER REFERENCES cases(id),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de transações financeiras
CREATE TABLE financial_transactions (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    case_id INTEGER REFERENCES cases(id),
    type VARCHAR(50) NOT NULL, -- 'income', 'expense'
    category VARCHAR(100), -- 'honorarios', 'custas', 'despesas', etc.
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    transaction_date DATE NOT NULL,
    payment_method VARCHAR(50), -- 'cash', 'credit_card', 'bank_transfer', etc.
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'overdue'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de leads comerciais
CREATE TABLE leads (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    company VARCHAR(255),
    source VARCHAR(100), -- 'website', 'referral', 'advertising', etc.
    status VARCHAR(50) DEFAULT 'new', -- 'new', 'contacted', 'qualified', 'converted', 'lost'
    notes TEXT,
    assigned_to INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de oportunidades de vendas
CREATE TABLE opportunities (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    estimated_value DECIMAL(10,2),
    probability INTEGER DEFAULT 50, -- 0-100%
    stage VARCHAR(50) DEFAULT 'prospecting', -- 'prospecting', 'proposal', 'negotiation', 'closed_won', 'closed_lost'
    expected_close_date DATE,
    assigned_to INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de documentos
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    file_path VARCHAR(500),
    file_type VARCHAR(50),
    file_size INTEGER,
    client_id INTEGER REFERENCES clients(id),
    case_id INTEGER REFERENCES cases(id),
    uploaded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhor performance
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_cases_client_id ON cases(client_id);
CREATE INDEX idx_cases_lawyer_id ON cases(lawyer_id);
CREATE INDEX idx_appointments_lawyer_id ON appointments(lawyer_id);
CREATE INDEX idx_appointments_client_id ON appointments(client_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_financial_transactions_client_id ON financial_transactions(client_id);
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to);


