const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');
const fs = require('fs');
const path = require('path');

class DocumentService {
    constructor() {
        // Criar diretório para documentos temporários se não existir
        this.tempDir = path.join(__dirname, '../../temp');
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    // Gerar documento Word com parecer
    async gerarWordParecer(intimacao, processo = null, cliente = null) {
        try {
            const doc = new Document({
                sections: [{
                    properties: {},
                    children: [
                        // Cabeçalho
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: "PARECER JURÍDICO",
                                    bold: true,
                                    size: 28,
                                })
                            ],
                            heading: HeadingLevel.TITLE,
                            alignment: AlignmentType.CENTER,
                        }),

                        // Espaçamento
                        new Paragraph({ text: "" }),

                        // Informações do processo
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: "DADOS DO PROCESSO",
                                    bold: true,
                                    size: 24,
                                })
                            ],
                            heading: HeadingLevel.HEADING_1,
                        }),

                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `Número do Processo: `,
                                    bold: true,
                                }),
                                new TextRun({
                                    text: intimacao.numero_processo || 'Não informado'
                                })
                            ]
                        }),

                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `Tribunal: `,
                                    bold: true,
                                }),
                                new TextRun({
                                    text: intimacao.tribunal || 'Não informado'
                                })
                            ]
                        }),

                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `Data de Disponibilização: `,
                                    bold: true,
                                }),
                                new TextRun({
                                    text: intimacao.data_disponibilizacao ? 
                                        new Date(intimacao.data_disponibilizacao).toLocaleDateString('pt-BR') : 
                                        'Não informado'
                                })
                            ]
                        }),

                        // Cliente (se disponível)
                        ...(cliente ? [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: `Cliente: `,
                                        bold: true,
                                    }),
                                    new TextRun({
                                        text: cliente.nome_completo || cliente.name || 'Não informado'
                                    })
                                ]
                            })
                        ] : []),

                        // Espaçamento
                        new Paragraph({ text: "" }),

                        // Teor da intimação
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: "TEOR DA INTIMAÇÃO",
                                    bold: true,
                                    size: 24,
                                })
                            ],
                            heading: HeadingLevel.HEADING_1,
                        }),

                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: intimacao.teor || 'Teor não disponível'
                                })
                            ]
                        }),

                        // Espaçamento
                        new Paragraph({ text: "" }),

                        // Resumo (se disponível)
                        ...(intimacao.resumo ? [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: "RESUMO",
                                        bold: true,
                                        size: 24,
                                    })
                                ],
                                heading: HeadingLevel.HEADING_1,
                            }),

                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: intimacao.resumo
                                    })
                                ]
                            }),

                            new Paragraph({ text: "" })
                        ] : []),

                        // Parecer
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: "PARECER JURÍDICO",
                                    bold: true,
                                    size: 24,
                                })
                            ],
                            heading: HeadingLevel.HEADING_1,
                        }),

                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: intimacao.parecer || 'Parecer não disponível'
                                })
                            ]
                        }),

                        // Espaçamento
                        new Paragraph({ text: "" }),

                        // Notas do advogado (se disponível)
                        ...(intimacao.notas_advogado ? [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: "OBSERVAÇÕES DO ADVOGADO",
                                        bold: true,
                                        size: 24,
                                    })
                                ],
                                heading: HeadingLevel.HEADING_1,
                            }),

                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: intimacao.notas_advogado
                                    })
                                ]
                            }),

                            new Paragraph({ text: "" })
                        ] : []),

                        // Rodapé
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `Documento gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
                                    italics: true,
                                    size: 20,
                                })
                            ],
                            alignment: AlignmentType.CENTER,
                        }),
                    ],
                }],
            });

            // Gerar arquivo
            const fileName = `parecer_${intimacao.numero_processo?.replace(/[^0-9]/g, '') || intimacao.id}_${Date.now()}.docx`;
            const filePath = path.join(this.tempDir, fileName);

            const buffer = await Packer.toBuffer(doc);
            fs.writeFileSync(filePath, buffer);

            return {
                fileName,
                filePath,
                buffer
            };
        } catch (error) {
            console.error('Erro ao gerar documento Word do parecer:', error);
            throw new Error('Erro interno do servidor ao gerar documento');
        }
    }

    // Gerar documento Word com minuta
    async gerarWordMinuta(intimacao, processo = null, cliente = null) {
        try {
            const doc = new Document({
                sections: [{
                    properties: {},
                    children: [
                        // Cabeçalho
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: "MINUTA DE RESPOSTA",
                                    bold: true,
                                    size: 28,
                                })
                            ],
                            heading: HeadingLevel.TITLE,
                            alignment: AlignmentType.CENTER,
                        }),

                        // Espaçamento
                        new Paragraph({ text: "" }),

                        // Informações do processo
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: "DADOS DO PROCESSO",
                                    bold: true,
                                    size: 24,
                                })
                            ],
                            heading: HeadingLevel.HEADING_1,
                        }),

                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `Processo nº: `,
                                    bold: true,
                                }),
                                new TextRun({
                                    text: intimacao.numero_processo || 'Não informado'
                                })
                            ]
                        }),

                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `Tribunal: `,
                                    bold: true,
                                }),
                                new TextRun({
                                    text: intimacao.tribunal || 'Não informado'
                                })
                            ]
                        }),

                        // Cliente (se disponível)
                        ...(cliente ? [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: `Requerente/Cliente: `,
                                        bold: true,
                                    }),
                                    new TextRun({
                                        text: cliente.nome_completo || cliente.name || 'Não informado'
                                    })
                                ]
                            })
                        ] : []),

                        // Espaçamento
                        new Paragraph({ text: "" }),

                        // Minuta
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: "MINUTA DE RESPOSTA",
                                    bold: true,
                                    size: 24,
                                })
                            ],
                            heading: HeadingLevel.HEADING_1,
                        }),

                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: intimacao.minuta_resposta || 'Minuta não disponível'
                                })
                            ]
                        }),

                        // Espaçamento
                        new Paragraph({ text: "" }),

                        // Notas do advogado (se disponível)
                        ...(intimacao.notas_advogado ? [
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: "OBSERVAÇÕES ADICIONAIS",
                                        bold: true,
                                        size: 24,
                                    })
                                ],
                                heading: HeadingLevel.HEADING_1,
                            }),

                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: intimacao.notas_advogado
                                    })
                                ]
                            }),

                            new Paragraph({ text: "" })
                        ] : []),

                        // Assinatura
                        new Paragraph({ text: "" }),
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: "________________________________",
                                })
                            ],
                            alignment: AlignmentType.CENTER,
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: "Assinatura do Advogado",
                                    bold: true,
                                })
                            ],
                            alignment: AlignmentType.CENTER,
                        }),

                        // Rodapé
                        new Paragraph({ text: "" }),
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `Documento gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
                                    italics: true,
                                    size: 20,
                                })
                            ],
                            alignment: AlignmentType.CENTER,
                        }),
                    ],
                }],
            });

            // Gerar arquivo
            const fileName = `minuta_${intimacao.numero_processo?.replace(/[^0-9]/g, '') || intimacao.id}_${Date.now()}.docx`;
            const filePath = path.join(this.tempDir, fileName);

            const buffer = await Packer.toBuffer(doc);
            fs.writeFileSync(filePath, buffer);

            return {
                fileName,
                filePath,
                buffer
            };
        } catch (error) {
            console.error('Erro ao gerar documento Word da minuta:', error);
            throw new Error('Erro interno do servidor ao gerar documento');
        }
    }

    // Limpar arquivos temporários antigos
    async limparArquivosTemporarios(idadeMaximaHoras = 24) {
        try {
            const files = fs.readdirSync(this.tempDir);
            const agora = Date.now();
            const idadeMaxima = idadeMaximaHoras * 60 * 60 * 1000; // Converter para milissegundos

            files.forEach(file => {
                const filePath = path.join(this.tempDir, file);
                const stats = fs.statSync(filePath);
                const idade = agora - stats.mtime.getTime();

                if (idade > idadeMaxima) {
                    fs.unlinkSync(filePath);
                    console.log(`Arquivo temporário removido: ${file}`);
                }
            });
        } catch (error) {
            console.error('Erro ao limpar arquivos temporários:', error);
        }
    }

    // Verificar se arquivo existe
    verificarArquivo(filePath) {
        return fs.existsSync(filePath);
    }

    // Remover arquivo específico
    removerArquivo(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Erro ao remover arquivo:', error);
            return false;
        }
    }
}

module.exports = DocumentService;