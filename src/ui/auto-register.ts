// Importa TUTTI i moduli in questa cartella per eseguire i side-effect di registrazione.
// Ogni file di componente chiama `ComponentRegistry.registerClass(...)` all'import.
// @ts-ignore
const modules = import.meta.glob('./*.ts', { eager: true });
// Facoltativo: filtra fuori file non-Componente (se necessario). In genere non serve.
void modules;
