# 勿忧管家运营台

租房平台 Web 管理端，采用 Vue 3、TypeScript、Vite、Pinia、Vue Router、Axios 和 Element Plus。

## 开发

```bash
npm install
npm run dev
```

开发服务器默认代理 `/api` 到 `http://localhost:18080`。启动后访问：

```txt
http://127.0.0.1:5173
```

## 检查

```bash
npm run typecheck
npm run lint
npm run build
```

## 数据来源

- 真实接口：管理端认证、数据看板、房源、订单、预约、租约、合同、账单、报修、用户、消息和系统管理等模块。
- 数据看板不具备可靠统计口径的指标显示“暂未提供”，不会展示模拟数值。

接口返回和请求类型统一维护在 `src/api`。
