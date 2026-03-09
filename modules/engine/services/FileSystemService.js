const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class FileSystemService {
    constructor() {
        // Resolve to project root (assuming this file is in modules/engine/services/)
        this.projectRoot = path.resolve(__dirname, '../../..');
    }

    _resolvePath(filePath) {
        // Prevent directory traversal attacks
        const safePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
        return path.resolve(this.projectRoot, safePath);
    }

    async executeAction(action, params) {
        const { filePath, content } = params;
        
        try {
            switch (action) {
                case 'create':
                case 'update':
                    const fullPath = this._resolvePath(filePath);
                    await fs.mkdir(path.dirname(fullPath), { recursive: true });
                    await fs.writeFile(fullPath, content, 'utf8');
                    return { success: true, message: `File ${action}d: ${filePath}` };
                
                case 'read':
                    const readPath = this._resolvePath(filePath);
                    const fileContent = await fs.readFile(readPath, 'utf8');
                    return { success: true, content: fileContent };
                
                case 'delete':
                    const delPath = this._resolvePath(filePath);
                    await fs.unlink(delPath);
                    return { success: true, message: `File deleted: ${filePath}` };
                
                case 'system_update':
                    // Simulate a system update (e.g., git pull, rebuild)
                    // In a real scenario, this might trigger a webhook or a specific script
                    console.log('[FileSystem] Triggering system update...');
                    return { success: true, message: 'System update signal sent. Service will restart shortly.' };
                
                case 'restore':
                    // Simple git restore to discard changes in working directory
                    await execAsync('git restore .', { cwd: this.projectRoot });
                    return { success: true, message: 'Changes restored via git.' };

                default:
                    throw new Error(`Unknown action: ${action}`);
            }
        } catch (error) {
            console.error(`[FileSystem] Error executing ${action}:`, error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new FileSystemService();