import { Script } from "scripting"

const projectDirectory = `${FileManager.scriptsDirectory}/girigirilove Glass C`

function requireMatch(source: string, pattern: RegExp, message: string) {
  if (!pattern.test(source)) throw new Error(message)
}

async function main() {
  const settingSource = await FileManager.readAsString(`${projectDirectory}/page/setting/index.tsx`)
  const bangumiSource = await FileManager.readAsString(`${projectDirectory}/class/bangumi.ts`)

  requireMatch(settingSource, /BangumiOAuthView/, "设置页缺少独立 Bangumi OAuth 授权页面入口")
  requireMatch(bangumiSource, /BANGUMI_SCRIPT_NAME = "girigirilove Glass C"/, "Bangumi OAuth 未使用当前脚本名称")
  requireMatch(settingSource + bangumiSource, /buildOAuthURLForCredentials/, "授权链接未支持输入后实时生成")
  requireMatch(settingSource, /<NavigationLink[^>]*destination=\{<BangumiOAuthView \/>\}/, "设置页未通过原有导航栈打开授权页")
  requireMatch(settingSource, /glassListRowStyleProps/, "设置入口未使用原有完整 Glass 行表面")
  if (/Navigation\.present\(\{ element: <BangumiOAuthView/.test(settingSource)) throw new Error("设置入口不应绕过原有导航栈")
  requireMatch(bangumiSource, /consumeOAuthCallback/, "Bangumi OAuth 客户端缺少回调消费")
  const oauthPageSource = await FileManager.readAsString(`${projectDirectory}/page/setting/bangumi_oauth.tsx`)
  requireMatch(oauthPageSource, /Script\.queryParameters/, "授权页未读取 OAuth 初始回调参数")
  requireMatch(oauthPageSource, /Script\.onResume/, "授权页未处理最小化恢复后的 OAuth 回调")
  requireMatch(oauthPageSource, /function callbackKey\(input/, "授权页缺少 OAuth 回调去重")
  requireMatch(oauthPageSource, /if \(!key \|\| key === consumedCallbackKey\) return/, "授权页会重复兑换同一个 OAuth 授权码")
  requireMatch(oauthPageSource, /status\.isAuthenticated \|\| status\.hasRefreshToken/, "授权结果未以本地 OAuth 会话为最终状态")
  requireMatch(oauthPageSource, /Pasteboard\.setString\(authorizationURL\)/, "授权页缺少复制授权链接")
  if (/didShowAuthorizationPrompt|授权链接已自动复制|defaultValue: authorizationURL/.test(oauthPageSource)) throw new Error("授权页不应自动暴露或复制完整授权链接")
  requireMatch(oauthPageSource, /Safari\.openURL\(authorizationURL\)/, "授权页缺少打开 Safari")
  requireMatch(oauthPageSource, /已生成，可复制或打开 Safari/, "授权链接未隐藏为状态摘要")
  requireMatch(oauthPageSource, /GlassSurface material="navigation" shape="capsule"/, "授权链接状态未使用小 Glass 提示条")
  if (/自动复制|完整文本框|弹出完整/.test(oauthPageSource)) throw new Error("授权页仍残留不存在的自动弹出链接文案")
  requireMatch(oauthPageSource, /authorizationURL\)/, "授权页缺少仅在复制动作中使用完整授权链接")
  requireMatch(oauthPageSource, /function OAuthStatusRow[\s\S]*GlassSurface material="content"/, "状态总览未拆成独立 Glass 行")
  requireMatch(oauthPageSource, /const ICON_COLUMN_WIDTH = 32[\s\S]*const ICON_HEIGHT = 28[\s\S]*const ICON_FONT = 22/, "授权页未使用脚本设置区的 SF Symbol 规格")
  requireMatch(oauthPageSource, /font=\{ICON_FONT\} foregroundStyle="secondaryLabel" frame=\{\{ width: ICON_COLUMN_WIDTH, height: ICON_HEIGHT, alignment: "center" \}\}/, "授权页 SF Symbol 未统一为脚本设置区规格")
  requireMatch(oauthPageSource, /icon=\{isAuthenticated \? "checkmark\.circle" : "questionmark\.circle"\}/, "授权状态未使用透明无底块 SF Symbol")
  requireMatch(oauthPageSource, /icon="key"/, "访问状态未使用透明 key SF Symbol")
  if (/person\.crop\.circle\.badge|key\.horizontal/.test(oauthPageSource)) throw new Error("授权页残留带底块或横向钥匙 SF Symbol")
  requireMatch(oauthPageSource, /status\.isAuthenticated \|\| status\.hasRefreshToken[\s\S]*已完成授权/, "已有授权时仍显示未开始授权")
  requireMatch(oauthPageSource, /Dialog\.prompt\(\{ title: "应用 ID"/, "App ID 未使用弹窗编辑")
  requireMatch(oauthPageSource, /Dialog\.prompt\(\{ title: "应用密钥"/, "Secret 未使用弹窗编辑")
  requireMatch(oauthPageSource, /Dialog\.prompt\(\{ title: "认证域名"/, "认证域名未使用弹窗编辑")
  requireMatch(oauthPageSource, /复制回调地址/, "授权页缺少复制回调地址操作")
  requireMatch(oauthPageSource, /const callbackURL = bangumiClient\.getOAuthConfig\(\)\.callbackURL\.trim\(\)/, "复制回调地址未使用实时真实 callbackURL")
  requireMatch(oauthPageSource, /Pasteboard\.setString\(callbackURL\)/, "复制回调地址未写入系统剪贴板")
  requireMatch(oauthPageSource, /回调地址已复制成功/, "复制回调地址缺少成功反馈")
  requireMatch(oauthPageSource, /复制回调地址失败/, "复制回调地址缺少失败反馈")
  requireMatch(oauthPageSource, /bangumiClient\.saveOAuthAuthDomain\(value\)/, "认证域名未持久化")
  requireMatch(oauthPageSource, /function TransparentSection/, "授权页缺少透明 Section 容器")
  requireMatch(oauthPageSource, /listRowBackground=/, "授权页透明 Section 缺少行背景")
  requireMatch(settingSource, /listRowBackground=/, "设置页缺少透明行背景契约")
  requireMatch(oauthPageSource, /bangumiClient\.saveOAuthClientConfig\(/, "授权页未保存 OAuth 应用配置")
  requireMatch(oauthPageSource, /bangumiClient\.clearOAuthAuth\(\)/, "授权页缺少清除 OAuth 会话动作")
  requireMatch(bangumiSource, /Script\.createRunSingleURLScheme\(BANGUMI_SCRIPT_NAME, \{ oauth_callback: "1" \}\)/, "Bangumi OAuth 缺少当前脚本回调地址")
  requireMatch(bangumiSource, /function normalizeAuth\(input: any, fallbackRefreshToken = ""\)/, "刷新响应缺少旧 refresh token 保留机制")
  requireMatch(bangumiSource, /normalizeAuth\(await response\.json\(\), preservedRefreshToken\)/, "刷新 token 时未保留服务端省略的 refresh token")
  requireMatch(bangumiSource, /if \(!auth\.accessToken\) \{[\s\S]*return refreshAuth\(auth\.refreshToken\)/, "仅有 refresh token 时未主动恢复会话")
  requireMatch(bangumiSource, /grant_type: "authorization_code"/, "Bangumi OAuth 缺少授权码兑换")
  requireMatch(bangumiSource, /grant_type: "refresh_token"/, "Bangumi OAuth 缺少自动续期")
  requireMatch(bangumiSource, /Storage\.set\(BANGUMI_AUTH_KEY, JSON\.stringify\(auth\)\)/, "Bangumi OAuth 会话未持久化")
  requireMatch(bangumiSource, /Authorization: `Bearer \$\{auth\.accessToken\}`/, "Bangumi 请求未携带 OAuth access token")
  if (/bangumi_beta_access_token|saveAccessToken|clearAccessToken|bgm\.tv\/login/.test(settingSource + bangumiSource)) throw new Error("不应残留错误的 Token/网页登录授权方案")

  console.log(JSON.stringify({ independentGlassPage: true, liveAuthorizationURL: true, oauthCallback: true, resumeRecovery: true, safariHandoff: true, refreshSession: true }))
}

main()
  .catch((error) => {
    console.error(error)
    throw error
  })
  .finally(() => {
    Script.exit()
  })
