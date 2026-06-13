import { z } from 'zod'
import {
  accountCodeToAuthEmail,
  inferRoleFromAccountCode,
  isRegistrableAccountCode,
  normalizeAccountCode
} from '~/shared/account'
import { useSupabaseAdmin } from '../../utils/supabase'

const registerSchema = z.object({
  account_code: z.string().trim(),
  password: z.string().min(6, '密码至少 6 位'),
  name: z.string().trim().min(1, '请输入姓名')
})

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, registerSchema.parse)
  const accountCode = normalizeAccountCode(body.account_code)
  const role = inferRoleFromAccountCode(accountCode)

  if (!isRegistrableAccountCode(accountCode) || !role) {
    throw createError({
      statusCode: 400,
      statusMessage: '请输入 8 位学号或 7 位工号。'
    })
  }

  const supabase = useSupabaseAdmin()
  const email = accountCodeToAuthEmail(accountCode)
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: body.password,
    email_confirm: true,
    user_metadata: {
      account_code: accountCode,
      name: body.name,
      role
    }
  })

  if (error || !data.user) {
    throw createError({
      statusCode: error?.message.toLowerCase().includes('already') ? 409 : 400,
      statusMessage: error?.message.toLowerCase().includes('already') ? '该学号或工号已注册。' : error?.message || '注册失败'
    })
  }

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: data.user.id,
    email,
    account_code: accountCode,
    name: body.name,
    role,
    avatar_url: null
  }, { onConflict: 'id' })

  if (profileError) {
    await supabase.auth.admin.deleteUser(data.user.id)
    throw createError({
      statusCode: 500,
      statusMessage: profileError.message
    })
  }

  return {
    account_code: accountCode,
    role
  }
})
