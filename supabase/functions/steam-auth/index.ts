// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login'

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  console.log('Steam auth action:', action)

  try {
    if (action === 'login') {
      // Generate Steam OpenID login URL
      const returnUrl = url.searchParams.get('return_url') || url.origin + '/auth/callback'
      
      const params = new URLSearchParams({
        'openid.ns': 'http://specs.openid.net/auth/2.0',
        'openid.mode': 'checkid_setup',
        'openid.return_to': returnUrl,
        'openid.realm': new URL(returnUrl).origin,
        'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
        'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
      })

      const steamLoginUrl = `${STEAM_OPENID_URL}?${params.toString()}`
      
      console.log('Redirecting to Steam login:', steamLoginUrl)

      return new Response(JSON.stringify({ url: steamLoginUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'link') {
      // Generate Steam OpenID login URL for account linking
      const returnUrl = url.searchParams.get('return_url') || url.origin + '/konto'
      const userId = url.searchParams.get('user_id')
      
      if (!userId) {
        throw new Error('User ID is required for linking')
      }
      
      // Store user_id in return URL for verification
      const linkReturnUrl = returnUrl.includes('?') 
        ? `${returnUrl}&link_user_id=${userId}` 
        : `${returnUrl}?link_user_id=${userId}`
      
      const callbackUrl = `${new URL(returnUrl).origin}/auth/steam-callback?link_user_id=${userId}&final_redirect=${encodeURIComponent(returnUrl)}`
      
      const params = new URLSearchParams({
        'openid.ns': 'http://specs.openid.net/auth/2.0',
        'openid.mode': 'checkid_setup',
        'openid.return_to': callbackUrl,
        'openid.realm': new URL(returnUrl).origin,
        'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
        'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
      })

      const steamLoginUrl = `${STEAM_OPENID_URL}?${params.toString()}`
      
      console.log('Redirecting to Steam for linking:', steamLoginUrl)

      return new Response(JSON.stringify({ url: steamLoginUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'verify') {
      // Verify Steam OpenID response
      const openidParams = url.searchParams
      const linkUserId = openidParams.get('link_user_id')
      
      // Change mode to check_authentication for verification
      const verifyParams = new URLSearchParams()
      openidParams.forEach((value, key) => {
        if (key.startsWith('openid.')) {
          verifyParams.append(key, value)
        }
      })
      verifyParams.set('openid.mode', 'check_authentication')

      console.log('Verifying Steam response...')

      // Verify with Steam
      const verifyResponse = await fetch(STEAM_OPENID_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: verifyParams.toString(),
      })

      const verifyText = await verifyResponse.text()
      console.log('Steam verify response:', verifyText)

      if (!verifyText.includes('is_valid:true')) {
        throw new Error('Steam verification failed')
      }

      // Extract Steam ID from claimed_id
      const claimedId = openidParams.get('openid.claimed_id')
      const steamIdMatch = claimedId?.match(/\/id\/(\d+)$/)
      
      if (!steamIdMatch) {
        throw new Error('Could not extract Steam ID')
      }

      const steamId = steamIdMatch[1]
      console.log('Steam ID:', steamId)

      // Get player info from Steam API
      const steamApiKey = Deno.env.get('STEAM_API_KEY')
      if (!steamApiKey) {
        throw new Error('Steam API key not configured')
      }

      const playerInfoUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${steamApiKey}&steamids=${steamId}`
      const playerResponse = await fetch(playerInfoUrl)
      const playerData = await playerResponse.json()

      console.log('Player data:', JSON.stringify(playerData))

      const player = playerData.response?.players?.[0]
      if (!player) {
        throw new Error('Could not fetch player info')
      }

      // Create Supabase client
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      // If this is a link action, just update the existing user's profile
      if (linkUserId) {
        console.log('Linking Steam to existing user:', linkUserId)
        
        // Check if Steam ID is already linked to another account
        const { data: existingLink } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('steam_id', steamId)
          .maybeSingle()
        
        if (existingLink && existingLink.user_id !== linkUserId) {
          throw new Error('To konto Steam jest już połączone z innym użytkownikiem')
        }
        
        // Update profile with Steam data
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            steam_id: steamId,
            display_name: player.personaname,
            avatar_url: player.avatarfull,
          })
          .eq('user_id', linkUserId)

        if (updateError) {
          console.error('Update profile error:', updateError)
          throw updateError
        }

        return new Response(JSON.stringify({
          success: true,
          linked: true,
          steamId,
          displayName: player.personaname,
          avatarUrl: player.avatarfull,
          userId: linkUserId,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Normal login flow - check if user with this Steam ID exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('steam_id', steamId)
        .maybeSingle()

      let userId: string
      let session: any = null

      if (existingProfile) {
        // User exists, get their auth user
        userId = existingProfile.user_id
        console.log('Existing user found:', userId)
        
        // Generate a magic link token for this user
        const { data: authData, error: authError } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: `steam_${steamId}@feathercup.local`,
        })
        
        if (authError) {
          console.error('Auth error:', authError)
          throw authError
        }

        session = authData
      } else {
        // Create new user
        const email = `steam_${steamId}@feathercup.local`
        const password = crypto.randomUUID()

        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            display_name: player.personaname,
            avatar_url: player.avatarfull,
            steam_id: steamId,
          },
        })

        if (createError) {
          console.error('Create user error:', createError)
          throw createError
        }

        userId = newUser.user.id
        console.log('New user created:', userId)

        // Update profile with Steam data
        await supabase
          .from('profiles')
          .update({
            steam_id: steamId,
            display_name: player.personaname,
            avatar_url: player.avatarfull,
          })
          .eq('user_id', userId)

        // Generate session
        const { data: authData } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email,
        })

        session = authData
      }

      // Update profile info
      await supabase
        .from('profiles')
        .update({
          display_name: player.personaname,
          avatar_url: player.avatarfull,
        })
        .eq('user_id', userId)

      return new Response(JSON.stringify({
        success: true,
        steamId,
        displayName: player.personaname,
        avatarUrl: player.avatarfull,
        userId,
        token: session?.properties?.hashed_token,
        redirectUrl: session?.properties?.action_link,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Steam auth error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
