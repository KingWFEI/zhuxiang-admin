<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { Lock, Phone } from '@element-plus/icons-vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { login } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

interface LoginForm {
  phone: string
  password: string
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const formRef = ref<FormInstance>()
const submitting = ref(false)
const errorMessage = ref('')
const loginForm = reactive<LoginForm>({ phone: '', password: '' })

const rules: FormRules<LoginForm> = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1\d{10}$/, message: '请输入正确的 11 位手机号', trigger: 'blur' },
  ],
  password: [{ required: true, message: '请输入登录密码', trigger: 'blur' }],
}

async function handleSubmit() {
  if (submitting.value || !(await formRef.value?.validate().catch(() => false))) return
  submitting.value = true
  errorMessage.value = ''
  try {
    const result = await login(loginForm)
    authStore.setAuth(result)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
    await router.replace(redirect)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '登录失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <section class="auth-form-wrap">
      <div class="auth-form-heading">
        <span>WELCOME BACK</span>
        <h1>登录管理端</h1>
        <p>使用管理员、管家或房东账号进入运营工作台。</p>
      </div>

      <el-form ref="formRef" :model="loginForm" :rules="rules" size="large" @submit.prevent="handleSubmit">
        <el-form-item prop="phone">
          <el-input v-model="loginForm.phone" :prefix-icon="Phone" placeholder="手机号" autocomplete="username" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            :prefix-icon="Lock"
            type="password"
            placeholder="登录密码"
            show-password
            autocomplete="current-password"
            @keyup.enter="handleSubmit"
          />
        </el-form-item>
        <el-alert v-if="errorMessage" :title="errorMessage" type="error" :closable="false" show-icon />
        <el-button class="submit-button" type="primary" native-type="submit" :loading="submitting" @click="handleSubmit">
          登录运营台
        </el-button>
      </el-form>

      <p class="auth-switch">需要创建开发账号？<router-link to="/register">进入注册</router-link></p>
    </section>
  </AuthLayout>
</template>

<style scoped lang="scss">
.auth-form-wrap {
  width: 100%;
  max-width: 380px;
  margin: 48px auto;
}

.auth-form-heading > span {
  color: #176b4d;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 1px;
}

h1 {
  margin: 11px 0 8px;
  font-size: 30px;
  letter-spacing: 0;
}

.auth-form-heading p,
.auth-switch {
  color: #77847e;
  font-size: 13px;
}

.auth-form-heading {
  margin-bottom: 28px;
}

.el-alert {
  margin-bottom: 16px;
}

.submit-button {
  width: 100%;
  margin-top: 4px;
}

.auth-switch {
  margin: 20px 0 0;
  text-align: center;
}

.auth-switch a {
  color: #176b4d;
  font-weight: 650;
}
</style>
