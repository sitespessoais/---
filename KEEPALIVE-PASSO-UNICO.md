# Supabase keepalive no GitHub (um passo)

O GitHub **bloqueia** criar/editar ficheiros em `.github/workflows/` com o token normal do `git push` / OAuth **sem** a permissÃ£o **`workflow`**.

## OpÃ§Ã£o A â€” 30 segundos no browser (recomendado)

1. Abre: `https://github.com/sitespessoais/---/new/main`
2. Em **file name** cola: `.github/workflows/supabase-keepalive.yml`
3. Copia **todo** o conteÃºdo do ficheiro local `.github/workflows/supabase-keepalive.yml` e cola no editor.
4. **Commit new file**.

(Isto usa a tua sessÃ£o no site e nÃ£o passa pelo limite do Git no PC.)

## OpÃ§Ã£o B â€” Token com scope `workflow`

1. GitHub â†’ **Settings** â†’ **Developer settings** â†’ **Personal access tokens** (classic).
2. Gera um token com **`repo`** + **`workflow`**.
3. No PC: `gh auth refresh -h github.com -s workflow` **ou** configura o Git a usar esse token para pushes.

Depois: `git checkout deploy-workflow` â†’ `git push origin HEAD:main`.

## Depois do ficheiro existir no repo

**Actions** â†’ **Supabase keepalive** â†’ **Run workflow** (e confirma secrets `SUPABASE_URL` + `SUPABASE_ANON_KEY`).
