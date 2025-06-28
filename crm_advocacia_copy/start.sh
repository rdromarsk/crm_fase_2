#!/bin/bash

echo "🚀 Iniciando CRM Advocacia - Fase 1"
echo "=================================="

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Verificar se as dependências estão instaladas
if [ ! -d "backend/node_modules" ]; then
    print_info "Dependências do backend não encontradas. Execute ./setup.sh primeiro."
    exit 1
fi

if [ ! -d "frontend/node_modules" ]; then
    print_info "Dependências do frontend não encontradas. Execute ./setup.sh primeiro."
    exit 1
fi

# Função para iniciar o backend
start_backend() {
    print_status "Iniciando backend na porta 3000..."
    cd backend
    npm start &
    BACKEND_PID=$!
    cd ..
    echo $BACKEND_PID > .backend.pid
}

# Função para iniciar o frontend
start_frontend() {
    print_status "Iniciando frontend na porta 3001..."
    cd frontend
    PORT=3001 npm start &
    FRONTEND_PID=$!
    cd ..
    echo $FRONTEND_PID > .frontend.pid
}

# Função para parar os serviços
stop_services() {
    echo ""
    print_info "Parando serviços..."
    
    if [ -f .backend.pid ]; then
        BACKEND_PID=$(cat .backend.pid)
        kill $BACKEND_PID 2>/dev/null
        rm .backend.pid
        print_status "Backend parado"
    fi
    
    if [ -f .frontend.pid ]; then
        FRONTEND_PID=$(cat .frontend.pid)
        kill $FRONTEND_PID 2>/dev/null
        rm .frontend.pid
        print_status "Frontend parado"
    fi
    
    exit 0
}

# Capturar Ctrl+C para parar os serviços
trap stop_services INT

# Verificar se os serviços já estão rodando
if [ -f .backend.pid ] || [ -f .frontend.pid ]; then
    print_info "Serviços já estão rodando. Parando primeiro..."
    stop_services
fi

# Iniciar serviços
start_backend
sleep 3
start_frontend

echo ""
print_status "Aplicação iniciada com sucesso!"
echo ""
echo "📋 Informações de acesso:"
echo "🌐 Frontend: http://localhost:3001"
echo "🔧 Backend API: http://localhost:3000"
echo ""
echo "👤 Login padrão:"
echo "   Email: admin@advocacia.com"
echo "   Senha: admin123"
echo ""
echo "📚 Documentação: README_FASE1.md"
echo ""
print_info "Pressione Ctrl+C para parar a aplicação"

# Aguardar indefinidamente
while true; do
    sleep 1
done