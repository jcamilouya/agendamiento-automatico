-- Permitir a usuarios autenticados insertar su propio negocio al registrarse
create policy "owner insert business"
  on businesses for insert
  to authenticated
  with check (owner_id = auth.uid());
