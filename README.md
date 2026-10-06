# 🐀 Anti-Rats

> Automatically detect and remove the GitHub accounts that follow you just so you'll follow them back... and then abandon you.

![Python](https://img.shields.io/badge/Python-3.8%2B-3776AB?logo=python&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![GitHub API](https://img.shields.io/badge/GitHub-REST%20API-181717?logo=github)

**Anti-Rats** is a command-line tool that compares your GitHub *following* list with your *followers* list, identifies the accounts that don't follow you back and, optionally, unfollows them for you. It ships with two equivalent implementations: **Python** and **JavaScript (Node.js)**.

---

## 📌 The problem

On GitHub there is a well-known practice called *follow/unfollow*: an account follows you hoping you'll do the same and, after a few days, unfollows you. The result is a profile that piles up thousands (sometimes hundreds of thousands) of followers while following nobody.

Checking this by hand is impractical once you follow hundreds of people. GitHub doesn't offer a "people I follow who don't follow me back" view, so this tool solves it using its official API.

## ✨ Features

- 🔍 **Non-reciprocal detection:** compares *following* vs *followers* and lists the accounts that don't follow you back.
- 🛡️ **Dry-run mode by default:** nothing is modified until you explicitly pass `--unfollow`.
- ✅ **Whitelist:** protect accounts you want to keep following without reciprocity (organizations, role models, projects).
- 📝 **Persistent history:** every removed account is logged in `ratas.txt` with the date.
- 📄 **Full pagination:** works no matter how many accounts you follow.
- ⏱️ **Respects API limits:** pauses between actions and automatically retries on rate limiting.
- 🧩 **Two equivalent versions:** Python and JavaScript, with the same options and behavior.

## 🧰 Requirements

| Version    | Requirements                                          |
|------------|-------------------------------------------------------|
| Python     | Python 3.8+, `requests`, `python-dotenv`              |
| JavaScript | Node.js 18+ (uses native `fetch`, no dependencies)    |

You also need a **GitHub personal access token** (see below).

## 🔑 Token setup

1. Go to **GitHub → Settings → Developer settings → Personal access tokens**.
2. Create a token with the following permission:
   - *Classic:* `user:follow` scope.
   - *Fine-grained:* user permission **Followers → Read and write**.
3. Create a `.env` file in the project root:

```env
GITHUB_TOKEN=ghp_your_token_here
```

> ⚠️ **Never commit your token to the repository.** Make sure `.env` is in your `.gitignore` (see [Security](#-security)).

## 🚀 Installation

```bash
git clone https://github.com/MarcoRosselDev/<repo-name>.git
cd <repo-name>
```

**Python**

```bash
pip install requests python-dotenv
```

**JavaScript**

No dependencies to install.

## ▶️ Usage

### Dry-run mode (recommended first)

Shows who doesn't follow you back **without making any changes**:

```bash
# Python
python anti_ratas.py

# JavaScript
node --env-file=.env anti_ratas.mjs
```

### Unfollowing

Add the `--unfollow` flag to apply the changes:

```bash
# Python
python anti_ratas.py --unfollow

# JavaScript
node --env-file=.env anti_ratas.mjs --unfollow
```

### Options

| Option                   | Description                                                        | Python                       | JavaScript                   |
|--------------------------|--------------------------------------------------------------------|------------------------------|------------------------------|
| Unfollow                 | Performs the unfollows (list-only by default)                      | `--unfollow`                 | `--unfollow`                 |
| Whitelist                | Users that will never be unfollowed                                | `--whitelist user1 user2`    | `--whitelist=user1,user2`    |
| Delay between actions    | Seconds between each unfollow (default `2`)                        | `--delay 3`                  | `--delay=3`                  |

### Example output

```text
Authenticated user: MarcoRosselDev
Followers: 182 | Following: 240 | Not following you back: 3

  https://github.com/example-user-1
  https://github.com/example-user-2
  https://github.com/example-user-3

Unfollowing...
  ✔ example-user-1
  ✔ example-user-2
  ✔ example-user-3

Done: 3/3 users unfollowed.
```

> Note: the console messages in the scripts are currently in Spanish. Translate the strings in the code if you want the output in English as well.

## 🗂️ Generated and configuration files

### `whitelist.txt` (optional)

One username per line. Lines starting with `#` are ignored. These accounts will never be unfollowed:

```text
# Accounts I follow for their content, not for reciprocity
torvalds
github
```

### `ratas.txt` (automatic)

History of removed accounts. It is created next to the script, and every run with `--unfollow` appends lines at the end without deleting previous ones:

```text
example-user-1 | 2026-10-05
example-user-2 | 2026-10-05
```

Each entry is written right when an unfollow is confirmed, so no information is lost if the process is interrupted.

## ⚙️ How it works

The tool uses three endpoints of the [GitHub REST API](https://docs.github.com/en/rest/users/followers):

| Action                        | Endpoint                              |
|-------------------------------|---------------------------------------|
| Get your followers            | `GET /user/followers`                 |
| Get who you follow            | `GET /user/following`                 |
| Unfollow a user               | `DELETE /user/following/{username}`   |

Execution flow:

1. Authenticates with your token and retrieves your username.
2. Downloads the complete *followers* and *following* lists (paginated, 100 per page).
3. Computes the difference: `following − followers − whitelist`.
4. Shows the result and, only if `--unfollow` was passed, removes each account with a pause between requests and logs each one in `ratas.txt`.

## 🔒 Security

- Add this to your `.gitignore` so you don't expose credentials or your history:

  ```gitignore
  .env
  ratas.txt
  ```

- Use a token with the minimum permissions required.
- If you think your token has been exposed, revoke it immediately from your GitHub settings.

## ⚠️ Considerations

- **Recent reciprocity:** the API doesn't tell you when someone started following you. If you run the script shortly after following someone, you might unfollow them before they have a chance to follow you back. Always use dry-run mode first and the whitelist for special cases.
- **Responsible use:** this project only automates *unfollowing*, with pauses between requests, and doesn't perform mass follows, a practice that goes against GitHub's usage policies.
- **No warranty:** unfollow actions are performed on your account and at your own responsibility.

## 🗺️ Project structure

```text
.
├── anti_ratas.py      # Python version
├── anti_ratas.mjs     # JavaScript (Node.js) version
├── whitelist.txt      # (optional) protected accounts
├── ratas.txt          # (generated) history of removed accounts
├── .env               # (local) GITHUB_TOKEN
└── README.md
```

## 🛣️ Future ideas

- Configurable grace period before removing a new non-reciprocal account.
- Avoid re-following accounts already recorded in `ratas.txt`.
- Export the history to JSON or CSV.
- Scheduled execution (cron / GitHub Actions).

## 📄 License

Distributed under the MIT license.

---

Made with humor and a bit of rage by [MarcoRosselDev](https://github.com/MarcoRosselDev).