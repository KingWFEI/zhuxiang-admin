# 租房 Web 管理端开发规范

## 1. 项目定位

本项目为租房平台 Web 管理端，主要服务于平台管理员、房东、管家等后台角色，用于完成房源管理、用户管理、租约管理、账单管理、门锁管理、报修管理、消息管理等后台业务操作。

项目采用：

```txt
Vue 3 + TypeScript + Vite + Vue Router + Pinia + Axios + Element Plus
```

开发目标：

```txt
1. 页面结构清晰
2. 代码风格统一
3. 接口调用规范
4. 类型定义明确
5. 组件适度封装
6. 便于多人协作开发
7. 便于后期维护和扩展
```

---

## 2. 技术栈规范

### 2.1 基础技术栈

```txt
Vue 3：前端框架
TypeScript：类型约束
Vite：项目构建工具
Vue Router：路由管理
Pinia：全局状态管理
Axios：接口请求
Element Plus：UI 组件库
SCSS：样式预处理
ESLint + Prettier：代码规范和格式化
```

### 2.2 推荐依赖

```bash
npm install vue-router pinia axios element-plus @element-plus/icons-vue

npm install sass -D
npm install eslint prettier eslint-plugin-vue @typescript-eslint/parser @typescript-eslint/eslint-plugin -D
```

---

## 3. 项目目录规范

推荐目录结构如下：

```txt
src
├─ api                         # 接口请求模块
│  ├─ auth.ts                  # 登录认证接口
│  ├─ user.ts                  # 用户管理接口
│  ├─ house.ts                 # 房源管理接口
│  ├─ lease.ts                 # 租约管理接口
│  ├─ bill.ts                  # 账单管理接口
│  ├─ lock.ts                  # 门锁管理接口
│  ├─ repair.ts                # 报修管理接口
│  ├─ message.ts               # 消息管理接口
│  └─ types.ts                 # 通用接口类型
│
├─ assets                      # 静态资源
│  ├─ images
│  └─ icons
│
├─ components                  # 通用组件
│  ├─ AppTable.vue             # 通用表格
│  ├─ AppDialog.vue            # 通用弹窗
│  ├─ AppSearchForm.vue        # 通用搜索表单
│  ├─ StatusTag.vue            # 状态标签
│  └─ UploadImage.vue          # 图片上传组件
│
├─ constants                   # 常量配置
│  ├─ status.ts                # 状态枚举
│  ├─ menu.ts                  # 菜单配置
│  └─ options.ts               # 下拉选项
│
├─ hooks                       # 组合式函数
│  ├─ usePagination.ts         # 分页逻辑
│  ├─ useTable.ts              # 表格逻辑
│  └─ usePermission.ts         # 权限判断
│
├─ layouts                     # 布局组件
│  ├─ BasicLayout.vue          # 后台主布局
│  └─ AuthLayout.vue           # 登录布局
│
├─ router                      # 路由配置
│  ├─ index.ts
│  └─ routes.ts
│
├─ stores                      # Pinia 状态管理
│  ├─ auth.ts                  # 登录状态
│  ├─ user.ts                  # 用户信息
│  └─ permission.ts            # 权限信息
│
├─ styles                      # 全局样式
│  ├─ index.scss
│  ├─ variables.scss
│  ├─ reset.scss
│  └─ element.scss
│
├─ utils                       # 工具函数
│  ├─ request.ts               # Axios 封装
│  ├─ storage.ts               # 本地存储封装
│  ├─ format.ts                # 格式化函数
│  ├─ validate.ts              # 表单校验函数
│  └─ auth.ts                  # 权限工具函数
│
├─ views                       # 页面模块
│  ├─ login                    # 登录页
│  │  └─ LoginPage.vue
│  │
│  ├─ dashboard                # 首页数据看板
│  │  └─ DashboardPage.vue
│  │
│  ├─ user                     # 用户管理
│  │  ├─ UserListPage.vue
│  │  └─ UserDetailPage.vue
│  │
│  ├─ house                    # 房源管理
│  │  ├─ HouseListPage.vue
│  │  ├─ HouseDetailPage.vue
│  │  └─ HouseFormPage.vue
│  │
│  ├─ lease                    # 租约管理
│  │  ├─ LeaseListPage.vue
│  │  └─ LeaseDetailPage.vue
│  │
│  ├─ bill                     # 账单管理
│  │  ├─ BillListPage.vue
│  │  └─ BillDetailPage.vue
│  │
│  ├─ lock                     # 门锁管理
│  │  ├─ LockListPage.vue
│  │  └─ LockDetailPage.vue
│  │
│  ├─ repair                   # 报修管理
│  │  ├─ RepairListPage.vue
│  │  └─ RepairDetailPage.vue
│  │
│  └─ message                  # 消息管理
│     └─ MessageListPage.vue
│
├─ App.vue
└─ main.ts
```

---

## 4. 命名规范

### 4.1 文件命名

页面文件使用大驼峰命名，并以 `Page.vue` 结尾：

```txt
HouseListPage.vue
HouseDetailPage.vue
UserListPage.vue
LeaseDetailPage.vue
```

通用组件使用大驼峰命名：

```txt
AppTable.vue
AppDialog.vue
StatusTag.vue
UploadImage.vue
```

接口文件使用小写命名：

```txt
auth.ts
user.ts
house.ts
lease.ts
bill.ts
lock.ts
repair.ts
```

工具函数文件使用小写命名：

```txt
request.ts
storage.ts
format.ts
validate.ts
```

---

### 4.2 变量命名

变量命名要表达真实业务含义。

推荐：

```ts
const houseList = ref<HouseItem[]>([]);
const userInfo = ref<UserInfo | null>(null);
const searchForm = reactive<HouseSearchParams>({
  keyword: "",
  status: undefined,
});
```

不推荐：

```ts
const list = ref([]);
const data = ref({});
const form = reactive({});
const aaa = ref("");
```

---

### 4.3 函数命名

常用函数命名规范：

```ts
fetchHouseList(); // 获取房源列表
handleSearch(); // 查询
handleReset(); // 重置
handleCreate(); // 新增
handleEdit(); // 编辑
handleDelete(); // 删除
handleSubmit(); // 提交
openDialog(); // 打开弹窗
closeDialog(); // 关闭弹窗
```

不推荐：

```ts
getData();
doSubmit();
clickBtn();
test();
```

---

## 5. 页面结构规范

管理端页面一般由以下部分组成：

```txt
1. 搜索区域
2. 操作按钮区域
3. 表格展示区域
4. 分页区域
5. 弹窗表单区域
```

标准页面结构示例：

```vue
<template>
  <div class="page-container">
    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="请输入房源名称、小区、地址"
            clearable
          />
        </el-form-item>

        <el-form-item label="房源状态">
          <el-select
            v-model="searchForm.status"
            placeholder="请选择状态"
            clearable
          >
            <el-option label="上架中" value="ONLINE" />
            <el-option label="已下架" value="OFFLINE" />
            <el-option label="已出租" value="RENTED" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 表格区域 -->
    <el-card class="table-card">
      <template #header>
        <div class="table-header">
          <span>房源列表</span>
          <el-button type="primary" @click="handleCreate">新增房源</el-button>
        </div>
      </template>

      <el-table :data="houseList" v-loading="loading" border>
        <el-table-column prop="title" label="房源标题" min-width="180" />
        <el-table-column
          prop="communityName"
          label="小区名称"
          min-width="140"
        />
        <el-table-column prop="price" label="月租金" width="120" />
        <el-table-column prop="status" label="状态" width="120" />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleDetail(row)"
              >详情</el-button
            >
            <el-button link type="primary" @click="handleEdit(row)"
              >编辑</el-button
            >
            <el-button link type="danger" @click="handleDelete(row)"
              >删除</el-button
            >
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="fetchHouseList"
          @size-change="fetchHouseList"
        />
      </div>
    </el-card>
  </div>
</template>
```

---

## 6. TypeScript 类型规范

### 6.1 所有接口数据必须定义类型

示例：

```ts
export interface HouseItem {
  id: string;
  title: string;
  coverImage: string;
  communityName: string;
  address: string;
  price: number;
  roomType: string;
  status: "ONLINE" | "OFFLINE" | "RENTED";
  createdAt: string;
}

export interface HouseSearchParams {
  keyword?: string;
  status?: string;
  page: number;
  pageSize: number;
}

export interface PageResult<T> {
  list: T[];
  total: number;
}
```

### 6.2 禁止滥用 any

不推荐：

```ts
const houseList = ref<any[]>([]);
const res: any = await getHouseList();
```

推荐：

```ts
const houseList = ref<HouseItem[]>([]);
const res = await getHouseList(params);
```

### 6.3 常用类型统一维护

推荐在 `src/api/types.ts` 中维护通用类型：

```ts
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface PageResult<T> {
  list: T[];
  total: number;
}

export interface PageParams {
  page: number;
  pageSize: number;
}
```

---

## 7. 接口请求规范

### 7.1 Axios 统一封装

所有接口请求必须通过 `src/utils/request.ts` 统一发起，不允许在页面中直接使用 `axios.get()` 或 `axios.post()`。

```ts
import axios from "axios";
import { ElMessage } from "element-plus";

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10000,
});

request.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

request.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const message = error.response?.data?.message || "请求失败，请稍后重试";
    ElMessage.error(message);
    return Promise.reject(error);
  },
);

export default request;
```

---

### 7.2 API 文件按业务模块拆分

房源接口示例：

```ts
// src/api/house.ts
import request from "@/utils/request";
import type { PageResult } from "./types";

export interface HouseItem {
  id: string;
  title: string;
  coverImage: string;
  communityName: string;
  address: string;
  price: number;
  status: string;
  createdAt: string;
}

export interface HouseSearchParams {
  keyword?: string;
  status?: string;
  page: number;
  pageSize: number;
}

export function getHouseList(params: HouseSearchParams) {
  return request.get<PageResult<HouseItem>>("/admin/houses", { params });
}

export function getHouseDetail(id: string) {
  return request.get<HouseItem>(`/admin/houses/${id}`);
}

export function createHouse(data: Partial<HouseItem>) {
  return request.post("/admin/houses", data);
}

export function updateHouse(id: string, data: Partial<HouseItem>) {
  return request.put(`/admin/houses/${id}`, data);
}

export function deleteHouse(id: string) {
  return request.delete(`/admin/houses/${id}`);
}
```

### 7.3 接口函数命名规范

```txt
getHouseList        获取房源列表
getHouseDetail      获取房源详情
createHouse         新增房源
updateHouse         更新房源
deleteHouse         删除房源

getUserList         获取用户列表
getLeaseList        获取租约列表
getBillList         获取账单列表
getLockList         获取门锁列表
```

---

## 8. 路由规范

### 8.1 路由配置

```ts
import { createRouter, createWebHistory } from "vue-router";
import BasicLayout from "@/layouts/BasicLayout.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/login",
      name: "Login",
      component: () => import("@/views/login/LoginPage.vue"),
      meta: {
        title: "登录",
        requiresAuth: false,
      },
    },
    {
      path: "/",
      component: BasicLayout,
      redirect: "/dashboard",
      meta: {
        requiresAuth: true,
      },
      children: [
        {
          path: "dashboard",
          name: "Dashboard",
          component: () => import("@/views/dashboard/DashboardPage.vue"),
          meta: {
            title: "数据看板",
          },
        },
        {
          path: "houses",
          name: "HouseList",
          component: () => import("@/views/house/HouseListPage.vue"),
          meta: {
            title: "房源管理",
            permission: "house:list",
          },
        },
        {
          path: "houses/:id",
          name: "HouseDetail",
          component: () => import("@/views/house/HouseDetailPage.vue"),
          meta: {
            title: "房源详情",
            permission: "house:detail",
          },
        },
      ],
    },
  ],
});

export default router;
```

### 8.2 路由守卫

```ts
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem("token");

  if (to.meta.requiresAuth && !token) {
    next("/login");
    return;
  }

  next();
});
```

### 8.3 路由命名规范

```txt
Dashboard
HouseList
HouseDetail
HouseForm
UserList
UserDetail
LeaseList
LeaseDetail
BillList
BillDetail
LockList
LockDetail
RepairList
RepairDetail
```

---

## 9. Pinia 状态管理规范

### 9.1 适合放入 Pinia 的数据

```txt
1. token
2. 当前登录用户信息
3. 当前用户角色
4. 当前用户权限
5. 菜单列表
6. 全局系统配置
```

### 9.2 不适合放入 Pinia 的数据

```txt
1. 某个页面的表格数据
2. 某个弹窗的显示状态
3. 某个表单的临时输入内容
4. 某个页面的 loading 状态
```

### 9.3 登录状态示例

```ts
import { defineStore } from "pinia";

interface UserInfo {
  id: string;
  username: string;
  realName: string;
  role: string;
}

export const useAuthStore = defineStore("auth", {
  state: () => ({
    token: localStorage.getItem("token") || "",
    userInfo: null as UserInfo | null,
  }),

  actions: {
    setToken(token: string) {
      this.token = token;
      localStorage.setItem("token", token);
    },

    setUserInfo(userInfo: UserInfo) {
      this.userInfo = userInfo;
    },

    clearLoginState() {
      this.token = "";
      this.userInfo = null;
      localStorage.removeItem("token");
    },
  },
});
```

---

## 10. 权限控制规范

租房管理端常见角色：

```txt
ADMIN       平台管理员
MANAGER     管家
LANDLORD    房东
FINANCE     财务人员
CUSTOMER    客服人员
```

### 10.1 页面权限

通过路由 `meta.permission` 控制：

```ts
{
  path: 'houses',
  name: 'HouseList',
  component: () => import('@/views/house/HouseListPage.vue'),
  meta: {
    title: '房源管理',
    permission: 'house:list',
  },
}
```

### 10.2 按钮权限

按钮权限建议封装工具函数：

```ts
export function hasPermission(permission: string) {
  const permissions = JSON.parse(localStorage.getItem("permissions") || "[]");
  return permissions.includes(permission);
}
```

页面中使用：

```vue
<el-button
  v-if="hasPermission('house:create')"
  type="primary"
  @click="handleCreate"
>
  新增房源
</el-button>
```

### 10.3 权限标识命名

```txt
house:list        房源列表
house:detail      房源详情
house:create      新增房源
house:update      修改房源
house:delete      删除房源

user:list         用户列表
user:update       修改用户
lease:list        租约列表
bill:list         账单列表
lock:list         门锁列表
repair:list       报修列表
```

---

## 11. 业务模块规范

### 11.1 登录认证模块

页面：

```txt
views/login/LoginPage.vue
```

接口：

```txt
api/auth.ts
```

主要功能：

```txt
1. 管理员登录
2. 保存 token
3. 获取当前用户信息
4. 退出登录
5. token 过期跳转登录页
```

---

### 11.2 房源管理模块

页面：

```txt
views/house/HouseListPage.vue
views/house/HouseDetailPage.vue
views/house/HouseFormPage.vue
```

接口：

```txt
api/house.ts
```

主要功能：

```txt
1. 房源列表查询
2. 新增房源
3. 编辑房源
4. 删除房源
5. 上架房源
6. 下架房源
7. 查看房源详情
8. 上传房源图片
```

---

### 11.3 用户管理模块

页面：

```txt
views/user/UserListPage.vue
views/user/UserDetailPage.vue
```

接口：

```txt
api/user.ts
```

主要功能：

```txt
1. 用户列表查询
2. 查看用户详情
3. 修改用户状态
4. 查看用户实名信息
5. 查看用户租约记录
```

---

### 11.4 租约管理模块

页面：

```txt
views/lease/LeaseListPage.vue
views/lease/LeaseDetailPage.vue
```

接口：

```txt
api/lease.ts
```

主要功能：

```txt
1. 租约列表
2. 租约详情
3. 审核租约
4. 终止租约
5. 查看合同信息
6. 查看关联房源和租客信息
```

---

### 11.5 账单管理模块

页面：

```txt
views/bill/BillListPage.vue
views/bill/BillDetailPage.vue
```

接口：

```txt
api/bill.ts
```

主要功能：

```txt
1. 账单列表
2. 账单详情
3. 支付状态查看
4. 账单催缴
5. 退款记录
```

---

### 11.6 门锁管理模块

页面：

```txt
views/lock/LockListPage.vue
views/lock/LockDetailPage.vue
```

接口：

```txt
api/lock.ts
```

主要功能：

```txt
1. 门锁列表
2. 门锁绑定
3. 门锁解绑
4. 查看门锁状态
5. 查看开锁记录
6. 管理员测试开锁
```

---

### 11.7 报修管理模块

页面：

```txt
views/repair/RepairListPage.vue
views/repair/RepairDetailPage.vue
```

接口：

```txt
api/repair.ts
```

主要功能：

```txt
1. 报修列表
2. 报修详情
3. 分配维修人员
4. 修改处理状态
5. 完成报修工单
```

---

## 12. 表格开发规范

### 12.1 表格必须包含 loading 状态

```vue
<el-table :data="tableData" v-loading="loading" border>
</el-table>
```

### 12.2 操作列固定在右侧

```vue
<el-table-column label="操作" width="220" fixed="right">
  <template #default="{ row }">
    <el-button link type="primary" @click="handleDetail(row)">详情</el-button>
    <el-button link type="primary" @click="handleEdit(row)">编辑</el-button>
    <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
  </template>
</el-table-column>
```

### 12.3 删除操作必须二次确认

```ts
import { ElMessage, ElMessageBox } from "element-plus";

async function handleDelete(row: HouseItem) {
  await ElMessageBox.confirm(`确认删除房源「${row.title}」吗？`, "删除确认", {
    type: "warning",
    confirmButtonText: "确认删除",
    cancelButtonText: "取消",
  });

  await deleteHouse(row.id);
  ElMessage.success("删除成功");
  fetchHouseList();
}
```

---

## 13. 表单开发规范

### 13.1 表单必须定义类型

```ts
interface HouseForm {
  title: string;
  communityId: string;
  address: string;
  price: number | undefined;
  roomType: string;
  description: string;
}
```

### 13.2 表单必须有校验规则

```ts
const rules = {
  title: [{ required: true, message: "请输入房源标题", trigger: "blur" }],
  communityId: [{ required: true, message: "请选择小区", trigger: "change" }],
  price: [{ required: true, message: "请输入租金", trigger: "blur" }],
};
```

### 13.3 提交时必须防止重复提交

```ts
const submitting = ref(false);

async function handleSubmit() {
  if (submitting.value) return;

  try {
    submitting.value = true;
    await createHouse(form);
    ElMessage.success("保存成功");
  } finally {
    submitting.value = false;
  }
}
```

---

## 14. 弹窗规范

### 14.1 弹窗命名

```ts
const dialogVisible = ref(false);
const dialogTitle = ref("新增房源");
```

### 14.2 新增和编辑可共用弹窗

```ts
const currentId = ref<string | null>(null);

function handleCreate() {
  currentId.value = null;
  dialogTitle.value = "新增房源";
  dialogVisible.value = true;
}

function handleEdit(row: HouseItem) {
  currentId.value = row.id;
  dialogTitle.value = "编辑房源";
  dialogVisible.value = true;
}
```

### 14.3 弹窗关闭时重置表单

```ts
function handleDialogClosed() {
  formRef.value?.resetFields();
}
```

---

## 15. 样式规范

### 15.1 全局页面样式

```scss
.page-container {
  padding: 16px;
}

.search-card {
  margin-bottom: 16px;
}

.table-card {
  margin-top: 16px;
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
```

### 15.2 颜色变量

```scss
$primary-color: #409eff;
$success-color: #67c23a;
$warning-color: #e6a23c;
$danger-color: #f56c6c;

$text-primary: #303133;
$text-regular: #606266;
$text-secondary: #909399;

$border-color: #dcdfe6;
$page-bg: #f5f7fa;
```

### 15.3 页面风格要求

```txt
1. 页面背景统一使用浅灰色
2. 内容区域使用白色卡片
3. 卡片间距统一为 16px
4. 表格操作按钮统一使用 link 类型
5. 删除、禁用等危险操作使用 danger 类型
6. 新增、保存、确认等主要操作使用 primary 类型
```

---

## 16. 状态字段规范

### 16.1 房源状态

```ts
export enum HouseStatus {
  ONLINE = "ONLINE",
  OFFLINE = "OFFLINE",
  RENTED = "RENTED",
}
```

中文映射：

```ts
export const houseStatusTextMap = {
  ONLINE: "上架中",
  OFFLINE: "已下架",
  RENTED: "已出租",
};
```

### 16.2 租约状态

```ts
export enum LeaseStatus {
  DRAFT = "DRAFT",
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED",
  TERMINATED = "TERMINATED",
}
```

中文映射：

```ts
export const leaseStatusTextMap = {
  DRAFT: "草稿",
  PENDING: "待确认",
  ACTIVE: "生效中",
  EXPIRED: "已到期",
  TERMINATED: "已终止",
};
```

### 16.3 账单状态

```ts
export enum BillStatus {
  UNPAID = "UNPAID",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
  REFUNDED = "REFUNDED",
}
```

中文映射：

```ts
export const billStatusTextMap = {
  UNPAID: "待支付",
  PAID: "已支付",
  OVERDUE: "已逾期",
  REFUNDED: "已退款",
};
```

---

## 17. 环境变量规范

### 17.1 开发环境

`.env.development`

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

### 17.2 生产环境

`.env.production`

```env
VITE_API_BASE_URL=https://api.example.com/api
```

### 17.3 使用方式

```ts
const baseUrl = import.meta.env.VITE_API_BASE_URL;
```

禁止在页面中写死接口地址：

```ts
axios.get("http://localhost:8000/api/admin/houses");
```

---

## 18. 错误处理规范

### 18.1 接口错误统一处理

接口错误优先在 Axios 响应拦截器中统一处理。

```ts
request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || "请求失败";
    ElMessage.error(message);
    return Promise.reject(error);
  },
);
```

### 18.2 页面中只处理业务提示

```ts
try {
  await updateHouse(id, form);
  ElMessage.success("保存成功");
} catch (error) {
  console.error(error);
}
```

---

## 19. Git 开发规范

### 19.1 分支规范

```txt
main        生产分支
develop     开发分支
feature/*   功能分支
fix/*       修复分支
hotfix/*    紧急修复分支
```

示例：

```bash
git checkout develop
git pull origin develop

git checkout -b feature/house-management
```

### 19.2 提交信息规范

```txt
feat: 新增功能
fix: 修复问题
style: 样式调整
refactor: 代码重构
docs: 文档更新
chore: 构建或依赖调整
```

示例：

```bash
git add .
git commit -m "feat: 新增房源管理页面"
git push -u origin feature/house-management
```

### 19.3 合并规范

```txt
1. 功能开发必须从 develop 拉取新分支
2. 功能完成后推送到远程 feature 分支
3. 创建 Pull Request 合并到 develop
4. 合并前需要解决冲突
5. 禁止直接向 main 分支提交代码
```

---

## 20. 页面开发流程规范

新增一个页面时，按照以下步骤开发：

```txt
1. 在 views 下创建页面文件
2. 在 api 下创建或补充接口方法
3. 在 api/types.ts 或当前模块中定义类型
4. 在 router 中配置路由
5. 在菜单配置中添加菜单项
6. 开发页面模板
7. 接入接口数据
8. 处理 loading、分页、空状态、错误提示
9. 补充新增、编辑、删除等操作
10. 自测功能是否完整
```

示例：新增房源管理页面

```txt
1. 创建 views/house/HouseListPage.vue
2. 创建 api/house.ts
3. 定义 HouseItem、HouseSearchParams
4. 配置路由 /houses
5. 添加菜单“房源管理”
6. 完成搜索表单
7. 完成表格展示
8. 完成分页查询
9. 完成新增、编辑、删除操作
10. 自测页面刷新、查询、重置、删除、分页
```

---

## 21. 推荐菜单结构

```txt
数据看板
├─ 平台概览

房源管理
├─ 房源列表
├─ 小区管理
├─ 房间管理

用户管理
├─ 租客管理
├─ 房东管理
├─ 管家管理

租约管理
├─ 租约列表
├─ 合同审核

账单管理
├─ 账单列表
├─ 支付记录
├─ 退款记录

门锁管理
├─ 门锁列表
├─ 开锁记录
├─ 门锁测试

报修管理
├─ 报修工单
├─ 维修记录

消息管理
├─ 系统通知
├─ 客服消息

系统管理
├─ 角色管理
├─ 权限管理
├─ 操作日志
```

---

## 22. 小型项目建议优先实现的模块

小型租房管理端第一阶段建议优先实现：

```txt
1. 登录
2. 首页数据看板
3. 房源管理
4. 用户管理
5. 租约管理
6. 账单管理
7. 门锁管理
8. 报修管理
```

可以暂缓实现：

```txt
1. 复杂权限系统
2. 操作日志
3. 多租户配置
4. 数据导出
5. 工作流审批
6. 动态菜单配置
```

---

## 23. 开发注意事项

```txt
1. 页面不要直接写 axios 请求，统一走 api 文件
2. 不要滥用 any，接口返回值必须定义类型
3. 删除、禁用、下架等危险操作必须二次确认
4. 表格必须有 loading 状态
5. 表单提交必须防止重复点击
6. token 失效必须自动跳转登录页
7. 页面刷新后要能恢复登录状态
8. 菜单和路由要保持一致
9. 公共样式统一放 styles
10. 公共逻辑优先抽成 hooks 或 utils
11. 重复出现三次以上的 UI 结构可以考虑封装组件
12. 小型项目不要过度封装，优先保证清晰可维护
```

---

## 24. 最终规范总结

租房 Web 管理端推荐采用：

```txt
Vue3 + TypeScript + Vite + Element Plus + Pinia + Vue Router + Axios
```

核心开发原则：

```txt
目录结构清晰
业务模块独立
接口请求统一
类型定义明确
页面风格统一
组件适度封装
权限控制清楚
Git 流程规范
```

项目开发时应优先保证：

```txt
能跑通业务流程
代码便于理解
多人协作不混乱
后期维护成本低
```
