
$ ->
  # Animate panther background
  $(".bg-container").animate({"opacity": "1"}, 4000)

  # Check for invalid login
  if window.location.search.includes "failed-login"
    $("#login-error-failed").removeClass "hidden"
  if window.location.search.includes "account-locked"
    $("#login-error-locked").removeClass "hidden"

  # Tests browsers for various things
  # Trusts javascript before userAgent, can let you know when they are different
  details = Browser.browser_details()

  if Browser.isnt_chrome then $('#login-notchrome').removeClass 'hidden'
  if details.mobiley then $('#login-mobiley').removeClass 'hidden'