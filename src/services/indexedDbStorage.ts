/**
 * HEALML IndexedDB Offline Storage Service
 * Provides client-side offline persistence for datasets, project state, and model evaluation runs
 * when internet or backend connectivity is interrupted.
 */

const DB_NAME = 'healml_local_db';
const DB_VERSION = 1;

class IndexedDbStorage {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB not supported in this environment'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('datasets')) {
          db.createObjectStore('datasets', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('training_runs')) {
          db.createObjectStore('training_runs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('offline_queue')) {
          db.createObjectStore('offline_queue', { keyPath: 'id', autoIncrement: true });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  async saveDataset(dataset: any): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('datasets', 'readwrite');
      tx.objectStore('datasets').put(dataset);
      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // Fallback
    }
  }

  async getDataset(id: string): Promise<any | null> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('datasets', 'readonly');
      const req = tx.objectStore('datasets').get(id);
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  }

  async listDatasets(): Promise<any[]> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('datasets', 'readonly');
      const req = tx.objectStore('datasets').getAll();
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return [];
    }
  }

  async saveProject(project: any): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('projects', 'readwrite');
      tx.objectStore('projects').put(project);
      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // Fallback
    }
  }

  async listProjects(): Promise<any[]> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('projects', 'readonly');
      const req = tx.objectStore('projects').getAll();
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return [];
    }
  }

  async saveTrainingRun(run: any): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('training_runs', 'readwrite');
      tx.objectStore('training_runs').put(run);
      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // Fallback
    }
  }

  async listTrainingRuns(projectId?: string): Promise<any[]> {
    try {
      const db = await this.getDB();
      const tx = db.transaction('training_runs', 'readonly');
      const req = tx.objectStore('training_runs').getAll();
      return new Promise((resolve, reject) => {
        req.onsuccess = () => {
          const all = req.result || [];
          if (projectId) {
            resolve(all.filter((r: any) => r.projectId === projectId));
          } else {
            resolve(all);
          }
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return [];
    }
  }
}

export const indexedDbStorage = new IndexedDbStorage();
