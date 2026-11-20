const query = new URLSearchParams(location.search);
const workbench = (query.has('cut')||query.has('animations')) ? import('./cutDemo.ts') : query.has('upperbody') ? import('./upperbody/editor.ts') : import('./main.ts');
void workbench.catch(error => { const status = document.getElementById('status') ?? document.getElementById('model-status'); if (status) status.textContent = `Could not start workbench: ${error instanceof Error ? error.message : String(error)}`; console.error(error); });
