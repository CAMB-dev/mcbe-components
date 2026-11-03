/* Source-only font preparation helper. The caller verifies the original TTF
 * before invoking this process. Upstream stb does not validate untrusted fonts. */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
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
  int i, result, count = 256, codepoints[256];
  if (argc != 2 && argc != 3) return 2;
  file = fopen(argv[1], "rb"); if (!file) return 3;
  fseek(file, 0, SEEK_END); size = ftell(file); rewind(file);
  if (size != 127504) return 4;
  font = malloc(size); pixels = calloc(1024 * 1024, 1);
  if (!font || !pixels || fread(font, 1, size, file) != size) return 5;
  fclose(file);
  if (!stbtt_InitFont(&info, font, stbtt_GetFontOffsetForIndex(font, 0))) return 6;
  if (argc == 3 && strcmp(argv[2], "--list") == 0) {
    int first = 1;
    printf("[");
    for (i = 0; i <= 0x10ffff; i++) {
      if (i >= 0xd800 && i <= 0xdfff) continue;
      if (stbtt_FindGlyphIndex(&info, i)) {
        printf("%s%d", first ? "" : ",", i); first = 0;
      }
    }
    printf("]\n"); free(font); free(pixels); return 0;
  }
  for (i = 0; i < 256; i++) codepoints[i] = i;
  if (argc == 3) {
    char tail;
    FILE *request = fopen(argv[2], "r");
    if (!request || fscanf(request, "%d", &count) != 1 || count < 1 || count > 256) return 11;
    for (i = 0; i < count; i++) {
      if (fscanf(request, "%d", &codepoints[i]) != 1 || codepoints[i] < 0 || codepoints[i] > 0x10ffff
          || (codepoints[i] >= 0xd800 && codepoints[i] <= 0xdfff)) return 11;
      if (!stbtt_FindGlyphIndex(&info, codepoints[i])) {
        fprintf(stderr, "Unsupported source glyph U+%04X", codepoints[i]); return 12;
      }
    }
    if (fscanf(request, " %c", &tail) == 1) return 11;
    fclose(request);
  }
  if (!stbtt_PackBegin(&context, pixels, 1024, 1024, 0, 1, NULL)) return 7;
  stbtt_PackSetOversampling(&context, 2, 2);
  if (argc == 2) result = stbtt_PackFontRange(&context, font, 0, 64.0f, 0, 256, chars);
  else {
    stbtt_pack_range range = {0};
    range.font_size = 64.0f; range.array_of_unicode_codepoints = codepoints;
    range.num_chars = count; range.chardata_for_range = chars;
    result = stbtt_PackFontRanges(&context, font, 0, &range, 1);
  }
  stbtt_PackEnd(&context); if (!result) return 8;
#ifdef _WIN32
  if (_setmode(_fileno(stdout), _O_BINARY) < 0) return 9;
#endif
  if (fwrite(pixels, 1, 1024 * 1024, stdout) != 1024 * 1024) return 10;
  fprintf(stderr, "[\n");
  for (i = 0; i < count; i++) {
    stbtt_packedchar *c = &chars[i];
    fprintf(stderr, "{\"codepoint\":%d,\"present\":%s,\"rect\":[%u,%u,%u,%u],\"offset\":[%.9g,%.9g],\"advance\":%.9g,\"offset2\":[%.9g,%.9g]}%s\n",
      codepoints[i], stbtt_FindGlyphIndex(&info, codepoints[i]) != 0 ? "true" : "false",
      c->x0,c->y0,c->x1,c->y1,c->xoff,c->yoff,c->xadvance,c->xoff2,c->yoff2,i==count-1?"":",");
  }
  fprintf(stderr, "]\n"); free(font); free(pixels); return 0;
}
