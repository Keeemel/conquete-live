import asyncio
import sys

import edge_tts


async def main():
    if len(sys.argv) != 4:
        raise ValueError("Expected voice, rate, and text")

    voice, rate, text = sys.argv[1:]
    communicate = edge_tts.Communicate(text=text, voice=voice, rate=rate)
    wrote_audio = False

    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            sys.stdout.buffer.write(chunk["data"])
            wrote_audio = True

    sys.stdout.buffer.flush()
    if not wrote_audio:
        raise RuntimeError("Edge-TTS returned no audio")


asyncio.run(main())
