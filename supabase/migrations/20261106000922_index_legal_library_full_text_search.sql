-- Applied to Supabase project JurisFlow as migration 20261106000922_index_legal_library_full_text_search.
create index if not exists legal_library_search_vector_idx
on public.legal_library using gin (
  to_tsvector('spanish'::regconfig,
    coalesce(title,'') || ' ' || coalesce(citation,'') || ' ' ||
    coalesce(summary,'') || ' ' || coalesce(authority,''))
);
