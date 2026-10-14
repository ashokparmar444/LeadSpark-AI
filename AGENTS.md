<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Website projects keep editable copy in `strategy` and a separate published `site_html` snapshot; saving a draft must never change the public site.
- Use the shared pure site renderer for editor previews and publishing so both show identical copy, with authenticated workspace-scoped mutations for saving and publishing.
