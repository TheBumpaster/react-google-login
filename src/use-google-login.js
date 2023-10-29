/* eslint-disable no-unused-vars */
/* eslint-disable no-unused-expressions */
/* eslint-disable no-console */

import jwt_decode from 'jwt-decode'

import { useState, useEffect } from 'react'
import loadScript from './load-script'
import removeScript from './remove-script'

const useGoogleLogin = ({
  onSuccess = () => {},
  onAutoLoadFinished = () => {},
  onFailure = () => {},
  onRequest = () => {},
  onScriptLoadFailure,
  clientId,
  cookiePolicy,
  loginHint,
  hostedDomain,
  autoLoad,
  isSignedIn,
  fetchBasicProfile,
  redirectUri,
  discoveryDocs,
  uxMode,
  scope,
  accessType,
  responseType,
  jsSrc = 'https://accounts.google.com/gsi/client',
  prompt
}) => {
  const [loaded, setLoaded] = useState(false)


  const handleSigninSuccess = function handleSigninSuccess(credentialResponse) {
    const credentialToken = credentialResponse.credential

    const payloadData = jwt_decode(credentialToken)

    const response = {}

    response.profileObj = {
      googleId: payloadData.sub,

      imageUrl: payloadData.picture,

      email: payloadData.email,

      name: payloadData.name,
      givenName: payloadData.given_name,
      familyName: payloadData.family_name
    }

    response.tokenObj = {
      id_token: credentialToken,
      access_token: credentialResponse.access_token
    }

    onSuccess(response)
  }

  const initializeAccount = () => {
    if (window.google && window.google.accounts) {
      window.google.accounts.id.initialize({
        client_id: clientId,

        itp_support: true,

        callback: (initresponse) => {
          const client = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope,
            itp_support: true,
            callback: (tokenResponse) => {
              handleSigninSuccess({credential: initresponse.credential, access_token: tokenResponse.access_token})
            },
          });
          client.requestAccessToken();
        }
      })
    } else {
      const initializeTimeout = setTimeout(() => {
        initializeAccount()

        clearTimeout(initializeTimeout)
      }, 1000)
    }
  }

  const signIn = function signIn(event) {
    if (event) {
      // to prevent submit if used within form
      event.preventDefault()
    }

    if (loaded) {

      window.google &&
        window.google.accounts &&
        window.google.accounts.id.prompt(notification => {
          
          if (notification.isNotDisplayed() && ['opt_out_or_no_session'].includes(notification.getNotDisplayedReason())) {

            const client =
              window.google &&
              window.google.accounts &&
              window.google.accounts.oauth2.initTokenClient({
                client_id: clientId,

                scope,

                callback(res) {

                  window.google &&
                    window.google.accounts &&
                    window.google.accounts.id.initialize({
                      client_id: clientId,

                      itp_support: true,
                      auto_select: true,

                      callback: (response) => {
                        
                        handleSigninSuccess(response)
                      }
                    })

                  window.google && window.google.accounts && window.google.accounts.id.prompt()
                }
              })

            client.requestAccessToken({ prompt })

          } else if (
            notification.isNotDisplayed() ||
            notification.isSkippedMoment() ||
            ['user_cancel', 'issuing_failed'].includes(notification.getSkippedReason())
          ) {
            document.cookie = `g_state=;path=/;expires=Thu, 01 Jan 1970 00:00:01 GMT`

            window.google && window.google.accounts && window.google.accounts.id.cancel()

            initializeAccount()
          }
        })
    } else {
      const loadTimeout = setTimeout(() => {

        signIn(event)

        clearTimeout(loadTimeout)
      }, 1000)
    }
  }

  useEffect(() => {

    let unmounted = false
    let initialize = false
    let bypassed = false

    const onLoadFailure = onScriptLoadFailure || onFailure

    loadScript(
      document,

      'script',

      'google-login',

      jsSrc,

      () => {
        initialize = true

        if (bypassed && !loaded) {
          initializeAccount()

          setLoaded(true)
        } else if (loaded) {
          initializeAccount()
        } else {
          window.onload = () => {
            initializeAccount()

            setLoaded(true)
          }
        }
      },
      error => {
        onLoadFailure(error)
      },

      () => {
        try {
          return !loaded && !initialize && window.google && window.google.accounts
        } finally {
          if (!loaded && !initialize) {
            bypassed = true
          }
        }
      }
    )

    return () => {
      unmounted = true

      document.cookie = `g_state=;path=/;expires=Thu, 01 Jan 1970 00:00:01 GMT`

      window.google && window.google.accounts && window.google.accounts.id.cancel()


      removeScript(document, 'google-login')
    }
  }, [])

  useEffect(() => {
    if (autoLoad) {
      signIn()
    }
  }, [loaded])

  return { signIn, loaded }
}

export default useGoogleLogin
