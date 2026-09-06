import {
  Button,
  HStack,
  Image,
  List,
  Navigation,
  Script,
  Section,
  Text,
  VStack,
  ZStack,
  useEffect,
  useState,
} from "scripting"
import { bangumiClient } from "../../class/bangumi"
import { GlassListRow, GlassSurface, PageBackground, ShelfHeader } from "../../design-glass"
const ICON_COLUMN_WIDTH = 32
const ICON_HEIGHT = 28
const ICON_FONT = 22

export function BangumiOAuthView() {
  const [clientId, setClientId] = useState("")
  const [clientSecretConfigured, setClientSecretConfigured] = useState(false)
  const [authorizationURL, setAuthorizationURL] = useState("")
  const [statusMessage, setStatusMessage] = useState("尚未开始授权")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [hasRefreshToken, setHasRefreshToken] = useState(false)

  function refreshState(message?: string) {
    const config = bangumiClient.getOAuthConfig()
    const status = bangumiClient.getOAuthStatus()
    setClientId(config.clientId)
    setClientSecretConfigured(Boolean(config.clientSecret))
    setAuthorizationURL(bangumiClient.buildOAuthURL())
    setIsAuthenticated(status.isAuthenticated)
    setHasRefreshToken(status.hasRefreshToken)
    if (message) {
      setStatusMessage(message)
    } else if (status.isAuthenticated || status.hasRefreshToken) {
      setStatusMessage("已完成授权，可自动续期")
    } else {
      setStatusMessage("尚未开始授权")
    }
  }

  useEffect(() => {
    refreshState()
    let disposed = false
    let consumedCallbackKey = ""

    function callbackKey(input: Record<string, any> | null | undefined) {
      if (!input) return ""
      const code = typeof input.code === "string" ? input.code : ""
      const error = typeof input.error === "string" ? input.error : ""
      return code || error
    }

    async function consumeCallback(input: Record<string, any> | null | undefined) {
      const key = callbackKey(input)
      if (!key || key === consumedCallbackKey) return
      consumedCallbackKey = key
      const result = await bangumiClient.consumeOAuthCallback(input)
      if (disposed || result.status === "idle") return
      const status = bangumiClient.getOAuthStatus()
      if (status.isAuthenticated || status.hasRefreshToken) {
        refreshState(result.status === "success" ? "Bangumi 已完成授权" : "已完成授权，可自动续期")
      } else {
        refreshState(result.message)
      }
    }

    void consumeCallback(Script.queryParameters)
    const removeResume = Script.onResume((details: { queryParameters: Record<string, any> | null }) => {
      void consumeCallback(details.queryParameters)
    })
    return () => {
      disposed = true
      removeResume()
    }
  }, [])

  function reloadAfterConfig(message: string) {
    refreshState(message)
  }

  async function editClientId() {
    const value = await Dialog.prompt({ title: "应用 ID", message: "填写你在 Bangumi 开发者平台创建的 App ID。", defaultValue: clientId, placeholder: "client_id", confirmLabel: "保存" })
    if (value === null) return
    bangumiClient.saveOAuthClientConfig(value.trim(), bangumiClient.getOAuthConfig().clientSecret)
    reloadAfterConfig("已更新 App ID，授权链接已刷新")
  }

  async function editClientSecret() {
    const value = await Dialog.prompt({ title: "应用密钥", message: "填写应用 Secret；仅保存在本机。", placeholder: "client_secret", obscureText: true, confirmLabel: "保存" })
    if (value === null) return
    bangumiClient.saveOAuthClientConfig(bangumiClient.getOAuthConfig().clientId, value.trim())
    reloadAfterConfig("已更新应用密钥，授权链接已刷新")
  }

  async function editAuthDomain() {
    const config = bangumiClient.getOAuthConfig()
    const value = await Dialog.prompt({ title: "认证域名", message: "默认使用官方认证域名，通常无需修改。", defaultValue: config.authDomain, placeholder: "next.bgm.tv", confirmLabel: "保存" })
    if (value === null) return
    bangumiClient.saveOAuthAuthDomain(value)
    reloadAfterConfig(`已切换认证域名：${bangumiClient.getOAuthConfig().authDomain}`)
  }

  async function copyCallbackURL() {
    const callbackURL = bangumiClient.getOAuthConfig().callbackURL.trim()
    if (!callbackURL) {
      setStatusMessage("回调地址生成失败，请重新打开本页")
      await Dialog.alert({ title: "复制回调地址失败", message: "当前脚本没有生成有效的回调地址。" })
      return
    }
    try {
      await Pasteboard.setString(callbackURL)
      setStatusMessage("回调地址已复制成功，请粘贴到 Bangumi 开发者平台")
      await Dialog.alert({ title: "回调地址已复制", message: "当前脚本的真实回调地址已复制到剪贴板。" })
    } catch (error) {
      setStatusMessage("回调地址复制失败，请重试")
      await Dialog.alert({ title: "复制回调地址失败", message: `${error}` })
    }
  }

  async function copyAuthorizationURL() {
    if (!authorizationURL) {
      setStatusMessage("请先配置 App ID 和 Secret")
      return
    }
    await Pasteboard.setString(authorizationURL)
    setStatusMessage("授权链接已复制，请打开 Safari 完成授权")
  }

  async function openAuthorizationURL() {
    if (!authorizationURL) {
      setStatusMessage("请先配置 App ID 和 Secret")
      return
    }
    await Safari.openURL(authorizationURL)
    setStatusMessage("已打开 Safari，授权完成后会自动返回当前脚本")
  }

  function clearSession() {
    bangumiClient.clearOAuthAuth()
    refreshState("已清除本机 Bangumi 登录会话")
  }

  return (
    <ZStack frame={{ maxWidth: "infinity", maxHeight: "infinity" }}>
      <PageBackground />
      <List navigationTitle="授权配置" navigationBarTitleDisplayMode="inline" listStyle="inset" listRowSpacing={10} listSectionSpacing={22} scrollContentBackground="hidden" listRowBackground={<></>} listRowSeparator="hidden">
        <TransparentSection title="状态总览">
          <OAuthStatusRow title="授权状态" value={isAuthenticated ? "已登录" : "未登录"} icon={isAuthenticated ? "checkmark.circle" : "questionmark.circle"} />
          <OAuthStatusRow title="应用 ID" value={clientId ? "已配置" : "未配置"} icon="number" />
          <OAuthStatusRow title="应用密钥" value={clientSecretConfigured ? "已配置" : "未配置"} icon="lock" />
          <OAuthStatusRow title="认证域名" value={bangumiClient.getOAuthConfig().authDomain} icon="network" />
          <OAuthStatusRow title="回调地址" value="已配置" icon="arrow.triangle.2.circlepath" />
          <OAuthStatusRow title="访问状态" value={hasRefreshToken ? "可自动续期" : isAuthenticated ? "当前有效" : "未授权"} icon="key" />
        </TransparentSection>

        <TransparentSection title="配置">
          <ConfigActionRow title="编辑应用 ID" icon="number" action={editClientId} />
          <ConfigActionRow title="编辑应用密钥" icon="lock" action={editClientSecret} />
          <ConfigActionRow title="编辑认证域名" icon="network" action={editAuthDomain} />
          <ConfigActionRow title="复制回调地址" icon="doc.on.doc" action={copyCallbackURL} />
        </TransparentSection>

        <TransparentSection title="授权入口">
          <GlassSurface material="content">
            <VStack alignment="leading" spacing={12} padding={16} frame={{ maxWidth: "infinity", alignment: "leading" }}>
              <Text font="footnote" foregroundStyle="secondaryLabel" multilineTextAlignment="leading">配置 App ID 和应用密钥后，复制授权链接并在 Safari 中完成 Bangumi 授权。授权成功后，Safari 会自动返回当前脚本。</Text>
              <Text font="caption" foregroundStyle="secondaryLabel">授权链接</Text>
              <GlassSurface material="navigation" shape="capsule" showsShadow={false}>
                <Text font="caption" foregroundStyle="secondaryLabel" padding={{ horizontal: 12, vertical: 7 }}>
                  {authorizationURL ? "已生成，可复制或打开 Safari" : "请先配置应用 ID 和应用密钥"}
                </Text>
              </GlassSurface>
              <HStack spacing={8} frame={{ maxWidth: "infinity" }}>
                <OAuthButton title="复制链接" icon="doc.on.doc" action={() => { void copyAuthorizationURL() }} disabled={!authorizationURL} />
                <OAuthButton title="打开 Safari" icon="safari" action={() => { void openAuthorizationURL() }} disabled={!authorizationURL} elevated />
              </HStack>
              <Text font="caption" foregroundStyle="secondaryLabel" multilineTextAlignment="leading">{statusMessage}</Text>
            </VStack>
          </GlassSurface>
        </TransparentSection>

        <TransparentSection title="会话操作">
          <ConfigActionRow title="清除本机登录会话" icon="trash" action={clearSession} destructive />
        </TransparentSection>

        <TransparentSection title="说明">
          <GlassListRow>
            <Text font="footnote" foregroundStyle="secondaryLabel" multilineTextAlignment="leading" padding={16}>“已配置应用 ID / Secret”只代表参数已保存；完成 Safari 授权并成功回调后，授权状态才会变为“已登录”。回调地址必须与开发者平台配置完全一致。</Text>
          </GlassListRow>
        </TransparentSection>
      </List>
    </ZStack>
  )
}

function TransparentSection(props: { title: string; children?: any }) {
  return (
    <Section>
      <VStack alignment="leading" spacing={10} frame={{ maxWidth: "infinity", alignment: "leading" }} listRowBackground={<></>} listRowSeparator="hidden">
        <ShelfHeader title={props.title} />
        {props.children}
      </VStack>
    </Section>
  )
}

function OAuthStatusRow(props: { title: string; value: string; icon: string }) {
  return (
    <GlassSurface material="content" shape={{ type: "rect", cornerRadius: 16, style: "continuous" }}>
      <HStack alignment="center" spacing={12} padding={{ horizontal: 16, vertical: 12 }} frame={{ maxWidth: "infinity", minHeight: 48, alignment: "leading" }}>
        <Image systemName={props.icon} font={ICON_FONT} foregroundStyle="secondaryLabel" frame={{ width: ICON_COLUMN_WIDTH, height: ICON_HEIGHT, alignment: "center" }} />
        <Text font="body" frame={{ width: 96, alignment: "leading" }}>{props.title}</Text>
        <Text font="body" foregroundStyle="secondaryLabel" multilineTextAlignment="trailing" frame={{ maxWidth: "infinity", alignment: "trailing" }}>{props.value}</Text>
      </HStack>
    </GlassSurface>
  )
}

function ConfigActionRow(props: { title: string; icon: string; action: () => void | Promise<void>; destructive?: boolean }) {
  return (
    <Button action={() => { void props.action() }} buttonStyle="plain" frame={{ maxWidth: "infinity", minHeight: 48 }} contentShape={{ type: "rect", cornerRadius: 16, style: "continuous" }} accessibilityLabel={props.title}>
      <HStack alignment="center" spacing={12} padding={{ horizontal: 16, vertical: 11 }} frame={{ maxWidth: "infinity", minHeight: 48, alignment: "leading" }}>
        <Image systemName={props.icon} font={ICON_FONT} foregroundStyle="secondaryLabel" frame={{ width: ICON_COLUMN_WIDTH, height: ICON_HEIGHT, alignment: "center" }} />
        <Text font="body" foregroundStyle={props.destructive ? "systemPink" : "label"}>{props.title}</Text>
      </HStack>
    </Button>
  )
}

function OAuthButton(props: { title: string; icon: string; action: () => void; disabled?: boolean; elevated?: boolean }) {
  return (
    <Button action={props.action} disabled={props.disabled} buttonStyle="plain" frame={{ maxWidth: "infinity", minHeight: 44 }} contentShape="capsule" accessibilityLabel={props.title}>
      <HStack spacing={7} padding={{ horizontal: 12, vertical: 9 }} frame={{ maxWidth: "infinity", minHeight: 44, alignment: "center" }}>
        <Image systemName={props.icon} font={ICON_FONT} foregroundStyle="secondaryLabel" frame={{ width: ICON_COLUMN_WIDTH, height: ICON_HEIGHT, alignment: "center" }} />
        <Text font="subheadline" fontWeight="semibold">{props.title}</Text>
      </HStack>
    </Button>
  )
}
