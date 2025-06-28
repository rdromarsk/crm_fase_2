#!/bin/bash

echo "🚀 Configurando CRM Advocacia - Fase 1"
echo "======================================"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para imprimir mensagens coloridas
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    print_error "Node.js não encontrado. Por favor, instale Node.js 16+ antes de continuar."
    exit 1
fi

# Verificar se PostgreSQL está instalado
if ! command -v psql &> /dev/null; then
    print_error "PostgreSQL não encontrado. Por favor, instale PostgreSQL antes de continuar."
    exit 1
fi

print_status "Node.js e PostgreSQL encontrados"

# Configurar backend
echo ""
echo "📦 Configurando Backend..."
cd backend

# Instalar dependências
print_status "Instalando dependências do backend..."
npm install

# Criar arquivo .env se não existir
if [ ! -f .env ]; then
    print_status "Criando arquivo .env..."
    cat > .env << EOL
# Configurações do Banco de Dados
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crm_advocacia
DB_USER=postgres
DB_PASSWORD=password

# Configurações de Autenticação
JWT_SECRET=crm_advocacia_jwt_secret_2024_fase1

# Configurações da Aplicação
NODE_ENV=development
PORT=3000

# Configurações de Upload
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760

# Configurações de Email (para futuras implementações)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASS=
EOL
    print_warning "Arquivo .env criado. Ajuste as configurações conforme necessário."
else
    print_status "Arquivo .env já existe"
fi

cd ..

# Configurar frontend
echo ""
echo "🎨 Configurando Frontend..."
cd frontend

# Instalar dependências
print_status "Instalando dependências do frontend..."
npm install

cd ..

# Configurar banco de dados
echo ""
echo "🗄️  Configurando Banco de Dados..."

# Verificar se o banco existe
DB_EXISTS=$(psql -U postgres -lqt | cut -d \| -f 1 | grep -w crm_advocacia)

if [ -z "$DB_EXISTS" ]; then
    print_status "Criando banco de dados..."
    createdb -U postgres crm_advocacia
else
    print_status "Banco de dados já existe"
fi

# Executar migrações
print_status "Executando migrações..."

# Schema principal
if psql -U postgres -d crm_advocacia -f database/schema.sql > /dev/null 2>&1; then
    print_status "Schema principal aplicado"
else
    print_warning "Schema principal já aplicado ou erro na aplicação"
fi

# Schema jurídico
if psql -U postgres -d crm_advocacia -f database/schema_juridico.sql > /dev/null 2>&1; then
    print_status "Schema jurídico aplicado"
else
    print_warning "Schema jurídico já aplicado ou erro na aplicação"
fi

# Schema de roles
if psql -U postgres -d crm_advocacia -f database/schema_roles_migration.sql > /dev/null 2>&1; then
    print_status "Schema de roles aplicado"
else
    print_warning "Schema de roles já aplicado ou erro na aplicação"
fi

# Schema NLP
if psql -U postgres -d crm_advocacia -f database/schema_nlp_migration.sql > /dev/null 2>&1; then
    print_status "Schema NLP aplicado"
else
    print_warning "Schema NLP já aplicado ou erro na aplicação"
fi

# Schema Fase 1
if psql -U postgres -d crm_advocacia -f database/schema_fase1_migration.sql > /dev/null 2>&1; then
    print_status "Schema Fase 1 aplicado"
else
    print_warning "Schema Fase 1 já aplicado ou erro na aplicação"
fi

# Usuários iniciais
if psql -U postgres -d crm_advocacia -f database/initial_users.sql > /dev/null 2>&1; then
    print_status "Usuários iniciais criados"
else
    print_warning "Usuários iniciais já existem ou erro na criação"
fi

# Criar diretórios necessários
echo ""
echo "📁 Criando diretórios..."
mkdir -p backend/uploads
mkdir -p backend/temp
mkdir -p backend/logs
print_status "Diretórios criados"

# Verificar se tudo está funcionando
echo ""
echo "🧪 Executando testes básicos..."

# Testar conexão com banco
if psql -U postgres -d crm_advocacia -c "SELECT 1;" > /dev/null 2>&1; then
    print_status "Conexão com banco de dados OK"
else
    print_error "Erro na conexão com banco de dados"
    exit 1
fi

echo ""
echo "🎉 Setup concluído com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "1. Iniciar o backend:"
echo "   cd backend && npm start"
echo ""
echo "2. Em outro terminal, iniciar o frontend:"
echo "   cd frontend && npm start"
echo ""
echo "3. Acessar a aplicação:"
echo "   http://localhost:3001 (frontend)"
echo "   http://localhost:3000 (backend API)"
echo ""
echo "4. Fazer login com:"
echo "   Email: admin@advocacia.com"
echo "   Senha: admin123"
echo ""
echo "5. Executar testes (opcional):"
echo "   node test_fase1.js"
echo ""
print_status "CRM Advocacia Fase 1 está pronto para uso!"