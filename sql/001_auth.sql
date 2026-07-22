-- Ejecutar en SQL Editor de Supabase Dashboard

-- 1. Crear tabla que vincula usuarios auth con bodegas
-- Columnas adicionales
ALTER TABLE productos ADD COLUMN IF NOT EXISTS codigo_barras TEXT;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS unidad TEXT DEFAULT 'unidad';
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS metodo_pago TEXT DEFAULT 'efectivo';
ALTER TABLE bodegas ADD COLUMN IF NOT EXISTS telefono TEXT;
ALTER TABLE bodegas ADD COLUMN IF NOT EXISTS direccion TEXT;

CREATE TABLE IF NOT EXISTS bodega_usuarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  bodega_id UUID REFERENCES bodegas(id) NOT NULL,
  nombre TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Insertar tu usuario
-- Primero registra tu email en Supabase Auth > Users > Add User
-- Luego reemplaza los IDs de abajo con los reales
INSERT INTO bodega_usuarios (user_id, bodega_id, nombre)
VALUES (
  'REEMPLAZA_CON_TU_USER_ID',        -- Sacar de Auth > Users
  '11111111-1111-1111-1111-111111111111',  -- Tu bodega demo
  'Carlos'
);

-- 3. (Opcional) RLS: cada usuario ve solo su bodega
-- Habilitar DESPUÉS de probar que el login funciona
/*
ALTER TABLE bodega_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE bodegas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven su propio vinculo"
  ON bodega_usuarios FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Usuarios ven sus productos"
  ON productos FOR ALL
  USING (bodega_id IN (
    SELECT bodega_id FROM bodega_usuarios WHERE user_id = auth.uid()
  ));

CREATE POLICY "Usuarios ven sus ventas"
  ON ventas FOR ALL
  USING (bodega_id IN (
    SELECT bodega_id FROM bodega_usuarios WHERE user_id = auth.uid()
  ));
*/
