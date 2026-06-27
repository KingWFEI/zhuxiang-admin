<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import AuthLayout from '@/layouts/AuthLayout.vue'
import { register } from '@/api/auth'
import type { AdminRole } from '@/api/types'
import { useAuthStore } from '@/stores/auth'

interface RegisterForm {
  phone: string
  nickname: string
  password: string
  confirmPassword: string
  role: AdminRole
}

const router = useRouter()
const authStore = useAuthStore()
const formRef = ref<FormInstance>()
const submitting = ref(false)
const errorMessage = ref('')
const registerForm = reactive<RegisterForm>({
  phone: '',
  nickname: '',
  password: '',
  confirmPassword: '',
  role: 'HOUSEKEEPER',
})

const rules: FormRules<RegisterForm> = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1\d{10}$/, message: '请输入正确的 11 位手机号', trigger: 'blur' },
  ],
  nickname: [
    { required: true, message: '请输入昵称', trigger: 'blur' },
    { min: 1, max: 30, message: '昵称长度为 1-30 位', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 32, message: '密码长度为 6-32 位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (value === registerForm.password) {
          callback()
        } else {
          callback(new Error('两次密码输入不一致'))
        }
      },
      trigger: 'blur',
    },
  ],
  role: [{ required: true, message: '请选择账号角色', trigger: 'change' }],
}

async function handleSubmit() {
  if (submitting.value || !(await formRef.value?.validate().catch(() => false))) return
  submitting.value = true
  errorMessage.value = ''
  try {
    const result = await register({
      phone: registerForm.phone,
      nickname: registerForm.nickname,
      password: registerForm.password,
      role: registerForm.role,
    })
    authStore.setAuth(result)
    await router.replace('/dashboard')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '注册失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AuthLayout>
    <section class="auth-form-wrap">
      <div class="auth-form-heading">
        <span>DEVELOPMENT ACCESS</span>
        <h1>创建管理账号</h1>
        <p>创建后将直接进入运营工作台。</p>
      </div>
      <el-alert
        title="当前注册接口可创建管理角色，仅建议用于开发环境初始化。"
        type="warning"
        :closable="false"
        show-icon
      />
      <el-form ref="formRef" :model="registerForm" :rules="rules" size="large" @submit.prevent="handleSubmit">
        <el-form-item prop="phone"><el-input v-model="registerForm.phone" placeholder="手机号" /></el-form-item>
        <el-form-item prop="nickname"><el-input v-model="registerForm.nickname" placeholder="姓名或昵称" /></el-form-item>
        <el-form-item prop="role">
          <el-select v-model="registerForm.role" placeholder="账号角色" style="width: 100%">
            <el-option label="管家" value="HOUSEKEEPER" />
            <el-option label="房东" value="LANDLORD" />
            <el-option label="平台管理员" value="ADMIN" />
          </el-select>
        </el-form-item>
        <div class="password-grid">
          <el-form-item prop="password"><el-input v-model="registerForm.password" type="password" show-password placeholder="密码" /></el-form-item>
          <el-form-item prop="confirmPassword"><el-input v-model="registerForm.confirmPassword" type="password" show-password placeholder="确认密码" /></el-form-item>
        </div>
        <el-alert v-if="errorMessage" :title="errorMessage" type="error" :closable="false" show-icon />
        <el-button class="submit-button" type="primary" :loading="submitting" @click="handleSubmit">创建并登录</el-button>
      </el-form>
      <p class="auth-switch">已有账号？<router-link to="/login">返回登录</router-link></p>
    </section>
  </AuthLayout>
</template>

<style scoped lang="scss">
.auth-form-wrap {
  width: 100%;
  max-width: 400px;
  margin: 38px auto;
}

.auth-form-heading > span {
  color: #176b4d;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 1px;
}

h1 {
  margin: 11px 0 8px;
  font-size: 28px;
  letter-spacing: 0;
}

.auth-form-heading p,
.auth-switch {
  color: #77847e;
  font-size: 13px;
}

.auth-form-heading {
  margin-bottom: 20px;
}

.el-alert {
  margin-bottom: 18px;
}

.password-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.submit-button {
  width: 100%;
}

.auth-switch {
  margin-top: 18px;
  text-align: center;
}

.auth-switch a {
  color: #176b4d;
  font-weight: 650;
}

@media (max-width: 480px) {
  .password-grid {
    grid-template-columns: 1fr;
    gap: 0;
  }
}
</style>
