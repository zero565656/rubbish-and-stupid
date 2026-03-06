# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Linux server deploy script

This repo includes a one-command deploy script for Linux + Nginx:

1. Prepare env file:

```sh
cp .env.production.example .env.production
```

2. Fill `.env.production` values (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_REVIEWER_LOGIN_URL`).

3. Run deploy:

```sh
bash scripts/deploy_linux.sh
```

Optional flags:

```sh
bash scripts/deploy_linux.sh --pull --web-root /var/www/r-s-journal
```

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## SMTP setup (Supabase Edge Function)

This project sends reviewer invitation emails via `supabase/functions/send-email`.

### Local development

SMTP variables are configured in:

- `supabase/functions/.env.local`

Run function locally with:

```sh
supabase functions serve send-email --env-file supabase/functions/.env.local
```

### Production (Supabase project secrets)

Set the same variables in your Supabase project:

```sh
supabase secrets set \
  SMTP_HOST=smtp.163.com \
  SMTP_PORT=465 \
  SMTP_USER=zero85958@163.com \
  SMTP_PASS=YOUR_SMTP_AUTH_CODE \
  SMTP_FROM=zero85958@163.com
```
