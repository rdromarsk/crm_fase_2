// utils/CredentialManager.js
const crypto = require('crypto');

class CredentialManager {
    constructor() {
        this.algorithm = 'aes-256-gcm';
        this.secretKey = process.env.CREDENTIAL_ENCRYPTION_KEY; // Esta chave DEVE ser diferente da JWT_SECRET

        if (!this.secretKey) {
            throw new Error('CREDENTIAL_ENCRYPTION_KEY não configurada. Por favor, defina esta variável de ambiente com uma chave forte.');
        }

        // Deriva uma chave de 32 bytes (256 bits) a partir da secretKey usando scrypt
        this.key = crypto.scryptSync(this.secretKey, 'static_salt_for_key_derivation', 32);
    }

    /**
     * Criptografa um texto plano.
     * @param {string} text O texto a ser criptografado.
     * @returns {{encrypted: string, iv: string, authTag: string}} Objeto contendo o texto criptografado, IV e tag de autenticação.
     */
    encrypt(text) {
        const iv = crypto.randomBytes(16); // IV (Initialization Vector) de 16 bytes para AES
        const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag(); // Tag de autenticação para GCM

        return {
            encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        };
    }

    /**
     * Descriptografa dados criptografados.
     * @param {{encrypted: string, iv: string, authTag: string}} encryptedData Objeto contendo o texto criptografado, IV e tag de autenticação.
     * @returns {string} O texto descriptografado.
     */
    decrypt(encryptedData) {
        const iv = Buffer.from(encryptedData.iv, 'hex');
        const authTag = Buffer.from(encryptedData.authTag, 'hex');
        const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);

        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }
}

module.exports = CredentialManager;

