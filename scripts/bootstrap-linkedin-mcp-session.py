"""Bootstrap a linkedin-mcp-server source session from an already logged-in profile.

The MCP server only creates its session artifacts (portable cookie export +
source-state.json) through the interactive `--login` flow, which opens a headful
browser and waits for a human. The agent containers already hold a logged-in
LinkedIn profile (created by agent-browser), so the credentials work — what is
missing is only the export step.

This drives the package's own launch/export/state-write code paths against the
existing profile, headless: no re-login, no new device identity, no credential
handling here. If the profile is not actually logged in, it fails loudly instead
of writing a session that would break later.

Run it inside a LinkedIn agent container, as the agent user, once per profile:

    uvx --from mcp-server-linkedin@latest python \
      /usr/local/bin/bootstrap-linkedin-mcp-session.py

The container entrypoint already exports USER_DATA_DIR and the trace/browser
paths the package reads. Verify afterwards with
`uvx mcp-server-linkedin@latest --status`.
"""

import asyncio
import sys

from linkedin_mcp_server.bootstrap import configure_browser_environment
from linkedin_mcp_server.config import get_config
from linkedin_mcp_server.core import BrowserManager, goto_reporting_proxy_errors
from linkedin_mcp_server.core.auth import is_logged_in
from linkedin_mcp_server.drivers.browser import get_profile_dir
from linkedin_mcp_server.session_state import portable_cookie_path, write_source_state


async def main() -> int:
    configure_browser_environment()
    config = get_config()
    profile_dir = get_profile_dir()
    print(f"Profile: {profile_dir}")

    manager = BrowserManager(
        user_data_dir=profile_dir,
        headless=True,
        slow_mo=config.browser.slow_mo,
        user_agent=config.browser.user_agent,
        viewport={
            "width": config.browser.viewport_width,
            "height": config.browser.viewport_height,
        },
    )

    async with manager as browser:
        await goto_reporting_proxy_errors(browser.page, "https://www.linkedin.com/feed/")
        await asyncio.sleep(3)
        if not await is_logged_in(browser.page):
            print("FAILED: profile is not logged in to LinkedIn.")
            return 1
        print("Profile session verified as logged in.")

        cookies = await browser.context.cookies()
        if not [c for c in cookies if c["name"] == "li_at"]:
            print("FAILED: no li_at cookie in the live context.")
            return 1

        if not await browser.export_cookies(portable_cookie_path(profile_dir)):
            print("FAILED: cookie export failed.")
            return 1
        print("Cookies exported.")

        state = write_source_state(profile_dir, user_agent=config.browser.user_agent)
        print(f"Source session generation: {state.login_generation}")

    print("OK")
    return 0


sys.exit(asyncio.run(main()))
