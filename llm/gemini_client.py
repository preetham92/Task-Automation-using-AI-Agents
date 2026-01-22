import os
from google import genai

# Configure client
client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)

MODEL_NAME = "gemini-2.5-flash"


def call_llm(prompt):
    """
    Calls Gemini LLM and returns plain text response
    """

    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt,
        config={
            "temperature": 0,
            "max_output_tokens": 1024
        }
    )

    return response.text
