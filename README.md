# 筑享运营台

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

- 真实接口：管理端认证、房源列表与新增、智能门锁、当前账号消息。
- 混合数据：数据看板中的房源指标为真实接口，其余运营指标为模拟数据。
- 模拟数据：用户、订单、租约、账单、报修和系统管理；页面均有明确标识。

接口返回和请求类型统一维护在 `src/api`，模拟数据统一维护在 `src/mocks`。
