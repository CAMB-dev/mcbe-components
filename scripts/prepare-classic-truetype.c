/* Source-only font preparation helper. The caller verifies the original TTF
 * before invoking this process. Upstream stb does not validate untrusted fonts. */
#include <stdio.h>
#include <stdlib.h>
#ifdef _WIN32
#include <io.h>
#include <fcntl.h>
#endif
#define STB_TRUETYPE_IMPLEMENTATION
#include "vendor/stb/stb_truetype.h"

int main(int argc, char **argv) {
  FILE *file;
  long size;
  unsigned char *font, *pixels;
  stbtt_pack_context context;
  stbtt_fontinfo info;
  stbtt_packedchar chars[256];
  int i, result;
  if (argc != 2) return 2;
  file = fopen(argv[1], "rb"); if (!file) return 3;
  fseek(file, 0, SEEK_END); size = ftell(file); rewind(file);
  if (size != 127504) return 4;
  font = malloc(size); pixels = calloc(1024 * 1024, 1);
  if (!font || !pixels || fread(font, 1, size, file) != size) return 5;
  fclose(file);
  if (!stbtt_InitFont(&info, font, stbtt_GetFontOffsetForIndex(font, 0))) return 6;
  if (!stbtt_PackBegin(&context, pixels, 1024, 1024, 0, 1, NULL)) return 7;
  stbtt_PackSetOversampling(&context, 2, 2);
  result = stbtt_PackFontRange(&context, font, 0, 64.0f, 0, 256, chars);
  stbtt_PackEnd(&context); if (!result) return 8;
#ifdef _WIN32
  if (_setmode(_fileno(stdout), _O_BINARY) < 0) return 9;
#endif
  if (fwrite(pixels, 1, 1024 * 1024, stdout) != 1024 * 1024) return 10;
  fprintf(stderr, "[\n");
  for (i = 0; i < 256; i++) {
    stbtt_packedchar *c = &chars[i];
    fprintf(stderr, "{\"codepoint\":%d,\"present\":%s,\"rect\":[%u,%u,%u,%u],\"offset\":[%.9g,%.9g],\"advance\":%.9g,\"offset2\":[%.9g,%.9g]}%s\n",
      i, stbtt_FindGlyphIndex(&info, i) != 0 ? "true" : "false",
      c->x0,c->y0,c->x1,c->y1,c->xoff,c->yoff,c->xadvance,c->xoff2,c->yoff2,i==255?"":",");
  }
  fprintf(stderr, "]\n"); free(font); free(pixels); return 0;
}
