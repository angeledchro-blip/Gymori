// Registro de acciones y navegación compartidos entre vistas (evita importaciones circulares).
export const acciones = {};
export function registrar(obj) {
  Object.assign(acciones, obj);
}

let fnIr = () => {};
let fnRefrescar = () => {};
export function conectar(fns) {
  fnIr = fns.ir;
  fnRefrescar = fns.refrescar;
}
export const ir = (...a) => fnIr(...a);
export const refrescar = (...a) => fnRefrescar(...a);
