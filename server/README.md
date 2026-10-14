# Static font-data API

完整性以实际读取字节数和 SHA-256 为准；缺少 Content-Length 不代表文件损坏。

`GET /font-deck-api/v1-r1/manifest.json`: pinned file IDs, lengths, hashes, upstream sources and license inventory.
`GET /font-deck-api/v1-r1/files/<sha256>.(ttf|woff2)`: unchanged allowlisted OFL binaries. SHA-256 filename is immutable. Standard static server supplies HEAD and Range. All other names return 404; no upload/delete or user text processing.
`GET /font-deck-api/v1-r1/licenses/...`: original licenses/copyright notices.

## 传输验收

字体路由禁用 gzip 并设置 no-transform，让 CDN 保留长度和 Range。完整性始终按实际读取字节数和 SHA-256 验证；合法分块传输可以没有 Content-Length。有长度头时额外交叉检查。源站和公网 Range 分开记录，不能把 200 完整下载当成 206 分段支持。

Build data with `python tools/stage-api.py --source /path/to/font-resources --output /served/root/font-deck-api/v1-r1` after acquiring sources from `extension/FONT-SOURCES.json`. For Nginx use `server/font-api.conf` inside the existing server block. The published font path alone needs anonymous machine access; never exempt the whole host. Verify 200/type/length/hash, 206 Range, CORS and unrelated host gate after reload. Files with changed bytes get a new SHA-256 path. No API credential or private key is part of this service.
