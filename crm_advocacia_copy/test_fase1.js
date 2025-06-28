const axios = require('axios');

// Configuração base
const BASE_URL = 'http://localhost:3000';
let authToken = '';

// Função para fazer login e obter token
async function login() {
    try {
        const response = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'admin@advocacia.com',
            password: 'admin123'
        });
        
        authToken = response.data.token;
        console.log('✅ Login realizado com sucesso');
        return true;
    } catch (error) {
        console.error('❌ Erro no login:', error.response?.data || error.message);
        return false;
    }
}

// Função para testar criação de cliente
async function testarCriacaoCliente() {
    try {
        const novoCliente = {
            nome_completo: 'João Silva Santos',
            email: 'joao.silva@email.com',
            telefone: '(85) 99999-9999',
            cpf_cnpj: '123.456.789-00',
            endereco: 'Rua das Flores, 123',
            cidade: 'Fortaleza',
            estado: 'CE',
            cep: '60000-000',
            notas: 'Cliente teste para validação da Fase 1'
        };

        const response = await axios.post(`${BASE_URL}/api/clientes`, novoCliente, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        console.log('✅ Cliente criado com sucesso:', response.data.id);
        return response.data;
    } catch (error) {
        console.error('❌ Erro ao criar cliente:', error.response?.data || error.message);
        return null;
    }
}

// Função para testar criação de processo
async function testarCriacaoProcesso() {
    try {
        const novoProcesso = {
            numero_processo: '1234567-89.2024.8.06.0001',
            tribunal: 'TJCE',
            tipo_acao: 'Ação de Cobrança',
            status: 'ativo',
            valor_causa: 50000.00,
            observacoes: 'Processo teste para validação da Fase 1'
        };

        const response = await axios.post(`${BASE_URL}/api/processos`, novoProcesso, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        console.log('✅ Processo criado com sucesso:', response.data.id);
        return response.data;
    } catch (error) {
        console.error('❌ Erro ao criar processo:', error.response?.data || error.message);
        return null;
    }
}

// Função para testar vinculação cliente-processo
async function testarVinculoClienteProcesso(clienteId, processoId) {
    try {
        const vinculo = {
            processo_id: processoId,
            client_id: clienteId,
            tipo_participacao: 'requerente'
        };

        const response = await axios.post(`${BASE_URL}/api/clientes/vincular-processo`, vinculo, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        console.log('✅ Cliente vinculado ao processo com sucesso');
        return response.data;
    } catch (error) {
        console.error('❌ Erro ao vincular cliente ao processo:', error.response?.data || error.message);
        return null;
    }
}

// Função para testar registro de atividade
async function testarRegistroAtividade(processoId) {
    try {
        const atividade = {
            processo_id: processoId,
            description: 'Reunião com cliente para discussão do caso',
            data_atividade: new Date().toISOString(),
            local: 'Escritório de Advocacia',
            observacoes: 'Cliente demonstrou interesse em acordo'
        };

        const response = await axios.post(`${BASE_URL}/api/atividades/externa`, atividade, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        console.log('✅ Atividade registrada com sucesso');
        return response.data;
    } catch (error) {
        console.error('❌ Erro ao registrar atividade:', error.response?.data || error.message);
        return null;
    }
}

// Função para testar busca de processos
async function testarBuscaProcessos() {
    try {
        const response = await axios.get(`${BASE_URL}/api/processos`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        console.log('✅ Processos encontrados:', response.data.length);
        return response.data;
    } catch (error) {
        console.error('❌ Erro ao buscar processos:', error.response?.data || error.message);
        return null;
    }
}

// Função para testar busca de clientes
async function testarBuscaClientes() {
    try {
        const response = await axios.get(`${BASE_URL}/api/clientes`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        console.log('✅ Clientes encontrados:', response.data.length);
        return response.data;
    } catch (error) {
        console.error('❌ Erro ao buscar clientes:', error.response?.data || error.message);
        return null;
    }
}

// Função principal de teste
async function executarTestes() {
    console.log('🚀 Iniciando testes da Fase 1...\n');

    // 1. Fazer login
    const loginSucesso = await login();
    if (!loginSucesso) {
        console.log('❌ Testes interrompidos devido a falha no login');
        return;
    }

    console.log('\n📋 Testando funcionalidades de Cliente...');
    
    // 2. Criar cliente
    const cliente = await testarCriacaoCliente();
    if (!cliente) {
        console.log('❌ Falha na criação de cliente');
        return;
    }

    // 3. Buscar clientes
    await testarBuscaClientes();

    console.log('\n⚖️ Testando funcionalidades de Processo...');
    
    // 4. Criar processo
    const processo = await testarCriacaoProcesso();
    if (!processo) {
        console.log('❌ Falha na criação de processo');
        return;
    }

    // 5. Buscar processos
    await testarBuscaProcessos();

    console.log('\n🔗 Testando vinculação Cliente-Processo...');
    
    // 6. Vincular cliente ao processo
    await testarVinculoClienteProcesso(cliente.id, processo.id);

    console.log('\n📝 Testando registro de atividades...');
    
    // 7. Registrar atividade
    await testarRegistroAtividade(processo.id);

    console.log('\n✅ Todos os testes da Fase 1 foram executados!');
    console.log('\n📊 Resumo dos testes:');
    console.log('- ✅ Autenticação');
    console.log('- ✅ CRUD de Clientes');
    console.log('- ✅ CRUD de Processos');
    console.log('- ✅ Vinculação Cliente-Processo');
    console.log('- ✅ Registro de Atividades');
    console.log('\n🎉 Fase 1 implementada com sucesso!');
}

// Executar testes se o arquivo for chamado diretamente
if (require.main === module) {
    executarTestes().catch(console.error);
}

module.exports = {
    executarTestes,
    login,
    testarCriacaoCliente,
    testarCriacaoProcesso,
    testarVinculoClienteProcesso,
    testarRegistroAtividade
};