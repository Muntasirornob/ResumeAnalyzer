from langchain_core.messages import HumanMessage, SystemMessage
from playwright.async_api import async_playwright

from promts.promts_reader import get_format_prompt


def format_resume_chain(resume, llm):
    system_prompt = get_format_prompt()
    resume_json = resume.model_dump_json(indent=2)

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"Generate the HTML resume for the following data:\n\n{resume_json}"),
    ]

    response = llm.invoke(messages)
    html_output = response.content if hasattr(response, "content") else str(response)

    if "<!DOCTYPE html>" in html_output:
        html_output = html_output[html_output.index("<!DOCTYPE html>") :]

    return html_output.strip()


async def html_to_pdf(html: str) -> bytes:
    async with async_playwright() as p:
        browser = await p.chromium.launch()

        page = await browser.new_page()

        await page.set_content(html, wait_until="networkidle")

        pdf = await page.pdf(
            format="Letter",
            print_background=True,
            prefer_css_page_size=True,
        )

        await browser.close()

        return pdf