const REEMPLAZOS_TILDE: Array<[string, string]> = [
  ['Ã¡', 'á'], ['Ã©', 'é'], ['Ã­', 'í'], ['Ã³', 'ó'], ['Ãº', 'ú'], ['Ã±', 'ñ'],
  ['Ã', 'Á'], ['Ã‰', 'É'], ['Ã', 'Í'], ['Ã“', 'Ó'], ['Ãš', 'Ú'], ['Ã‘', 'Ñ']
];

export function repararTextoConTildes(value: string | null | undefined) {
  let texto = String(value ?? '').trim();
  for (const [incorrecto, correcto] of REEMPLAZOS_TILDE) {
    texto = texto.split(incorrecto).join(correcto);
  }
  return texto;
}

export function normalizarTextoBusqueda(value: string | null | undefined) {
  return repararTextoConTildes(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
