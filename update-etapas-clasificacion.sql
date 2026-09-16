UPDATE etapas_catalogo 
SET clasificacion = 'precontractual'
WHERE clasificacion = 'sin_clasificar';

SELECT COUNT(*) as updated_rows FROM etapas_catalogo WHERE clasificacion = 'precontractual';
