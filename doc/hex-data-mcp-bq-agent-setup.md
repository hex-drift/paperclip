# hex-data-mcp-bq: як підключити агента і що йому написати

Короткий гайд для того, хто наймає або налаштовує нових агентів у Paperclip.

MCP `hex-data-mcp-bq` — read-only доступ до BigQuery. Агент шле SQL, сервер перевіряє запит і повертає рядки. Дані не змінюються. Ключ Google агенту не віддається.

## 1. Кому він з’являється

Не компанії і не всім агентам автоматично.

MCP піднімається **тільки якщо** в env агента є непорожній ключ:

```text
HEX_DATA_MCP_BQ_TOKEN
```

Немає ключа — немає BigQuery MCP. Є ключ — OpenCode інжектить сервер `hex-data-mcp-bq` на цей ран.

Токен клади як **company secret + `secret_ref`**, не plaintext у `adapterConfig.env`.

| Поле | Значення |
| --- | --- |
| Secret key | `hex-data-mcp-bq-token` |
| Env на агенті | `HEX_DATA_MCP_BQ_TOKEN` → `secret_ref` на цей секрет, version `latest` |
| MCP URL (дефолт) | `https://hex-data-mcp-bq.hexdrift-project.workers.dev/mcp` |
| Опційний override | `HEX_DATA_MCP_BQ_URL` — лише якщо потрібен інший ендпоінт |

У LEE секрет уже заведений. Новому агенту цієї компанії достатньо прив’язати **той самий** секрет на `HEX_DATA_MCP_BQ_TOKEN`. Новий секрет не створюй, якщо не ротуєш токен.

Іншим компаніям цей LEE-секрет не світиться. Якщо MCP потрібен іншій компанії — окремий секрет у тій компанії і своя прив’язка.

Не вставляй Bearer-токен у чат, issue, `AGENTS.md` і не віддавай його агенту як текст.

## 2. Як прив’язати нового агента

1. Відкрий агента → configuration / env.
2. Додай `HEX_DATA_MCP_BQ_TOKEN`.
3. Тип — посилання на company secret `hex-data-mcp-bq-token`, не рядок.
4. Збережи. Рестарт сервера не потрібен: підхопиться на **наступному** рані.
5. Допиши блок з розділу 3 в інструкції агента (`AGENTS.md` або еквівалент). Без цього тексту агент часто піде в bash / вигадає інший доступ, навіть якщо MCP уже є.

Перевірка після першого питання з даними: у логу рану мають бути тули з префіксом `hex-data-mcp-bq_`. Не має бути `bq` CLI, `gcloud` і шляхів з Google key.

## 3. Блок інструкції — скопіюй в `AGENTS.md`

Нижче — готовий текст. Встав як є. Якщо в агента вже є правила доставки / reply / thread — цей блок **додай**, не заміняй їх.

Допиши фільтр бренду/проекту в абзаці «Brand scope», коли з’явиться каталог таблиць. Поки його немає, агент бачить усе, що дозволяє токен.

```md
## BigQuery reads — live query tools first

If this run has tools whose names start with `hex-data-mcp-bq_`, use them for
every warehouse explore or SQL read. Typical names:

- dataset / table listing (`list_tables`, `list_datasets` or equivalent)
- `get_table_schema` / `get_context` — before writing SQL
- `query_*` — the read itself

Do not invent another SQL path when those tools are present: no `bq` CLI,
no `gcloud`, no Google key, no local script, no other database toolkit.
The tools execute the SQL you send unmodified. Only `SELECT` / `WITH`.
Never `INSERT`, `UPDATE`, `DELETE`, `CREATE`, `DROP` or any other write.

**Brand scope.** Keep every query inside this company's data. Do not scan
another brand or project "just to compare" unless the person asked for that.
When a catalog skill or table notes name a project / dataset / brand key,
put that filter in every query that can see more than one brand.

If those live tools are **not on this run**, say you cannot read the
warehouse right now. Do not guess figures and do not look for a fallback
that works.

Never name the tools, MCP, tokens, or how the query ran to the person.
Database and table names are allowed only when the person asks where a
number came from.
```

## 4. Що сказати агенту окремо (якщо питають «як працювати з даними»)

Коротко, людською мовою — можна в `MAIN.md` або в таблиці «How to work»:

```md
| When | Read |
| ---- | ---- |
| ClickHouse / old warehouse, if those live tools are on this run | `hex-data-mcp_*` |
| BigQuery explore or SQL, if those live tools are on this run | `hex-data-mcp-bq_*` |
| BigQuery or ClickHouse if the matching tools are missing | stop — say the warehouse is not available |
```

Не пиши в інструкції `HEX_DATA_MCP_BQ_TOKEN` і URL воркера. Це операторський шар, не шар агента.

## 5. Чого не робити

- Не класти токен у plaintext env «на швидкість».
- Не додавати цей MCP через `PAPERCLIP_OPENCODE_MCP` з токеном у JSON — той самий секрет тоді світиться в конфігу.
- Не просити агента «підключи MCP» у чаті. Або ключ є, або немає.
- Не розраховувати, що новий агент LEE отримає MCP сам. Прив’язка — кроком 2.
- Не змішувати з `HEX_DATA_MCP_TOKEN` (це інший MCP, ClickHouse). Обидва можуть бути на одному агенті, якщо потрібні обидва склади.

## 6. Мінімальний чеклист перед здачею агента

- [ ] `HEX_DATA_MCP_BQ_TOKEN` = `secret_ref`, не рядок
- [ ] блок з розділу 3 є в інструкціях
- [ ] фільтр бренду/датасету дописаний, якщо каталог уже є
- [ ] тестове питання з чату (не board-only issue) пішло в `hex-data-mcp-bq_*`
- [ ] у відповіді людині немає слів MCP, tool, token, worker
