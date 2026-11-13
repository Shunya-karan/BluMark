import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';
import '../providers/auth_provider.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});
  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 650),
    )..forward();
    Future.microtask(() => ref.read(authProvider.notifier).restore());
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: AppColors.lightBlue,
    body: Stack(
      children: [
        const _BackgroundOrbs(),
        SafeArea(
          child: Center(
            child: FadeTransition(
              opacity: CurvedAnimation(
                parent: _controller,
                curve: Curves.easeOut,
              ),
              child: ScaleTransition(
                scale: Tween<double>(begin: 0.94, end: 1).animate(
                  CurvedAnimation(
                    parent: _controller,
                    curve: Curves.easeOutBack,
                  ),
                ),
                child: const Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _Brand(height: 112),
                    SizedBox(height: 36),
                    SizedBox(
                      height: 26,
                      width: 26,
                      child: CircularProgressIndicator(
                        color: AppColors.teal,
                        strokeWidth: 3,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    ),
  );
}

class _Brand extends StatelessWidget {
  const _Brand({this.height = 76, this.alignment = CrossAxisAlignment.center});
  final double height;
  final CrossAxisAlignment alignment;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: alignment,
    mainAxisSize: MainAxisSize.min,
    children: [
      Image.asset(
        'assets/images/logo2.png',
        height: height,
        fit: BoxFit.contain,
        filterQuality: FilterQuality.high,
      ),
      const SizedBox(height: 12),
      const Text(
        'Smart Attendance System',
        style: TextStyle(
          color: AppColors.textSecondary,
          fontSize: 14,
          fontWeight: FontWeight.w500,
          letterSpacing: .2,
        ),
      ),
    ],
  );
}

class RoleSelectionScreen extends StatefulWidget {
  const RoleSelectionScreen({super.key});
  @override
  State<RoleSelectionScreen> createState() => _RoleSelectionScreenState();
}

class _RoleSelectionScreenState extends State<RoleSelectionScreen> {
  String? role;
  @override
  Widget build(BuildContext context) => _AuthPage(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _Brand(alignment: CrossAxisAlignment.start),
        const SizedBox(height: 36),
        const _SectionTitle(
          title: 'How will you sign in?',
          subtitle: 'Choose your account type to continue.',
        ),
        const SizedBox(height: 24),
        _RoleCard(
          role: 'STUDENT',
          selected: role == 'STUDENT',
          icon: Icons.school_rounded,
          description: 'Access attendance, timetable and study materials.',
          accent: AppColors.primary,
          iconBackground: AppColors.lightBlue,
          onTap: () => setState(() => role = 'STUDENT'),
        ),
        const SizedBox(height: 14),
        _RoleCard(
          role: 'TEACHER',
          selected: role == 'TEACHER',
          icon: Icons.cast_for_education_rounded,
          description: 'Manage classes and attendance.',
          accent: AppColors.teal,
          iconBackground: AppColors.lightTeal,
          onTap: () => setState(() => role = 'TEACHER'),
        ),
        const SizedBox(height: 28),
        ElevatedButton(
          onPressed: role == null ? null : () => context.go('/login/$role'),
          style: ElevatedButton.styleFrom(
            backgroundColor: role == 'TEACHER'
                ? AppColors.teal
                : AppColors.primary,
            disabledBackgroundColor: AppColors.border,
            disabledForegroundColor: AppColors.textMuted,
          ),
          child: const Text('Continue'),
        ),
      ],
    ),
  );
}

class _RoleCard extends StatelessWidget {
  const _RoleCard({
    required this.role,
    required this.selected,
    required this.icon,
    required this.description,
    required this.accent,
    required this.iconBackground,
    required this.onTap,
  });
  final String role, description;
  final bool selected;
  final IconData icon;
  final Color accent, iconBackground;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    selected: selected,
    label: '$role account type',
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      curve: Curves.easeOut,
      decoration: BoxDecoration(
        color: selected ? iconBackground : AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: selected ? accent : AppColors.border,
          width: selected ? 2 : 1,
        ),
        boxShadow: selected
            ? [
                BoxShadow(
                  color: accent.withValues(alpha: .12),
                  blurRadius: 18,
                  offset: const Offset(0, 7),
                ),
              ]
            : const [],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(19),
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Row(
              children: [
                AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  height: 52,
                  width: 52,
                  decoration: BoxDecoration(
                    color: selected ? accent : iconBackground,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Icon(
                    icon,
                    color: selected ? AppColors.white : accent,
                    size: 28,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${role[0]}${role.substring(1).toLowerCase()}',
                        style: const TextStyle(
                          color: AppColors.textPrimary,
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 5),
                      Text(
                        description,
                        style: const TextStyle(
                          color: AppColors.textSecondary,
                          fontSize: 14,
                          height: 1.35,
                        ),
                      ),
                    ],
                  ),
                ),
                AnimatedScale(
                  duration: const Duration(milliseconds: 180),
                  scale: selected ? 1 : .65,
                  child: Icon(
                    Icons.check_circle_rounded,
                    color: accent,
                    size: 26,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key, required this.role});
  final String role;
  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _form = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool obscure = true;
  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final busy = auth.status == AuthStatus.loading;
    final accent = widget.role == 'TEACHER'
        ? AppColors.teal
        : AppColors.primary;
    return _AuthPage(
      child: Form(
        key: _form,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const _Brand(alignment: CrossAxisAlignment.start),
            const SizedBox(height: 34),
            const _SectionTitle(
              title: 'Welcome back',
              subtitle: 'Sign in to continue to your Blu-Mark account.',
            ),
            const SizedBox(height: 18),
            _RolePill(role: widget.role, accent: accent),
            const SizedBox(height: 26),
            TextFormField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'Email address',
                hintText: 'name@institution.edu',
                prefixIcon: Icon(Icons.mail_outline_rounded),
              ),
              validator: (value) =>
                  value == null ||
                      !RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(value)
                  ? 'Enter a valid email address'
                  : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _password,
              obscureText: obscure,
              textInputAction: TextInputAction.done,
              onFieldSubmitted: (_) => _submit(busy),
              decoration: InputDecoration(
                labelText: 'Password',
                prefixIcon: const Icon(Icons.lock_outline_rounded),
                suffixIcon: IconButton(
                  tooltip: obscure ? 'Show password' : 'Hide password',
                  onPressed: () => setState(() => obscure = !obscure),
                  icon: Icon(
                    obscure
                        ? Icons.visibility_outlined
                        : Icons.visibility_off_outlined,
                  ),
                ),
              ),
              validator: (value) =>
                  value == null || value.isEmpty ? 'Enter your password' : null,
            ),
            if (auth.message != null) _ErrorMessage(message: auth.message!),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: busy ? null : () => context.go('/forgot'),
                child: const Text('Forgot password?'),
              ),
            ),
            const SizedBox(height: 10),
            ElevatedButton(
              onPressed: busy ? null : () => _submit(false),
              style: ElevatedButton.styleFrom(backgroundColor: accent),
              child: busy
                  ? const SizedBox(
                      height: 22,
                      width: 22,
                      child: CircularProgressIndicator(
                        color: AppColors.white,
                        strokeWidth: 2.5,
                      ),
                    )
                  : const Text('Sign in'),
            ),
            Center(
              child: TextButton(
                onPressed: () => context.go('/role'),
                child: const Text('Choose a different role'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _submit(bool busy) async {
    if (busy || !_form.currentState!.validate()) return;
    await ref
        .read(authProvider.notifier)
        .login(_email.text.trim(), _password.text, widget.role);
  }
}

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});
  @override
  ConsumerState<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _email = TextEditingController();
  String? message;
  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => _AuthPage(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _Brand(alignment: CrossAxisAlignment.start),
        const SizedBox(height: 36),
        const _SectionTitle(
          title: 'Reset your password',
          subtitle: 'We will send reset instructions if the account exists.',
        ),
        const SizedBox(height: 24),
        TextField(
          controller: _email,
          keyboardType: TextInputType.emailAddress,
          decoration: const InputDecoration(
            labelText: 'Email address',
            prefixIcon: Icon(Icons.mail_outline_rounded),
          ),
        ),
        if (message != null)
          Padding(
            padding: const EdgeInsets.only(top: 14),
            child: Text(
              message!,
              style: const TextStyle(color: AppColors.textSecondary),
            ),
          ),
        const SizedBox(height: 20),
        ElevatedButton(
          onPressed: () async {
            final error = await ref
                .read(authProvider.notifier)
                .forgotPassword(_email.text.trim());
            setState(
              () => message =
                  error ??
                  'If an account exists, reset instructions have been sent.',
            );
          },
          child: const Text('Send instructions'),
        ),
      ],
    ),
  );
}

class ChangePasswordScreen extends ConsumerStatefulWidget {
  const ChangePasswordScreen({super.key});
  @override
  ConsumerState<ChangePasswordScreen> createState() =>
      _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends ConsumerState<ChangePasswordScreen> {
  final old = TextEditingController();
  final next = TextEditingController();
  String? message;
  @override
  void dispose() {
    old.dispose();
    next.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => _AuthPage(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _SectionTitle(
          title: 'Create a new password',
          subtitle: 'A new password is required before you can continue.',
        ),
        const SizedBox(height: 24),
        TextField(
          controller: old,
          obscureText: true,
          decoration: const InputDecoration(
            labelText: 'Current password',
            prefixIcon: Icon(Icons.lock_outline_rounded),
          ),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: next,
          obscureText: true,
          decoration: const InputDecoration(
            labelText: 'New password (12+ characters)',
            prefixIcon: Icon(Icons.password_rounded),
          ),
        ),
        if (message != null)
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Text(
              message!,
              style: const TextStyle(color: AppColors.error),
            ),
          ),
        const SizedBox(height: 20),
        ElevatedButton(
          onPressed: () async {
            if (next.text.length < 12) {
              setState(() => message = 'Use at least 12 characters.');
              return;
            }
            final error = await ref
                .read(authProvider.notifier)
                .changePassword(old.text, next.text);
            setState(
              () =>
                  message = error ?? 'Password changed. Please sign in again.',
            );
          },
          child: const Text('Change password'),
        ),
      ],
    ),
  );
}

class DashboardPlaceholder extends ConsumerWidget {
  const DashboardPlaceholder({super.key, required this.role});
  final String role;
  @override
  Widget build(BuildContext context, WidgetRef ref) => Scaffold(
    appBar: AppBar(title: Text('$role dashboard')),
    body: Center(
      child: ElevatedButton(
        onPressed: () => ref.read(authProvider.notifier).logout(),
        child: const Text('Sign out'),
      ),
    ),
  );
}

class _AuthPage extends StatelessWidget {
  const _AuthPage({required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) => Scaffold(
    body: Stack(
      children: [
        const _BackgroundOrbs(),
        SafeArea(
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 520),
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 32,
                ),
                child: child,
              ),
            ),
          ),
        ),
      ],
    ),
  );
}

class _BackgroundOrbs extends StatelessWidget {
  const _BackgroundOrbs();
  @override
  Widget build(BuildContext context) => IgnorePointer(
    child: Stack(
      children: [
        Positioned(top: -85, right: -65, child: _orb(190, AppColors.lightBlue)),
        Positioned(
          bottom: -110,
          left: -80,
          child: _orb(230, AppColors.lightTeal),
        ),
      ],
    ),
  );
  Widget _orb(double size, Color color) => Container(
    height: size,
    width: size,
    decoration: BoxDecoration(color: color, shape: BoxShape.circle),
  );
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title, required this.subtitle});
  final String title, subtitle;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Container(
        height: 4,
        width: 42,
        decoration: BoxDecoration(
          color: AppColors.teal,
          borderRadius: BorderRadius.circular(4),
        ),
      ),
      const SizedBox(height: 14),
      Text(
        title,
        style: const TextStyle(
          color: AppColors.textPrimary,
          fontSize: 28,
          fontWeight: FontWeight.w800,
          letterSpacing: -.5,
        ),
      ),
      const SizedBox(height: 8),
      Text(
        subtitle,
        style: const TextStyle(
          color: AppColors.textSecondary,
          fontSize: 15,
          height: 1.45,
        ),
      ),
    ],
  );
}

class _RolePill extends StatelessWidget {
  const _RolePill({required this.role, required this.accent});
  final String role;
  final Color accent;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
    decoration: BoxDecoration(
      color: accent.withValues(alpha: .10),
      borderRadius: BorderRadius.circular(99),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          role == 'TEACHER'
              ? Icons.cast_for_education_rounded
              : Icons.school_rounded,
          size: 17,
          color: accent,
        ),
        const SizedBox(width: 7),
        Text(
          '${role[0]}${role.substring(1).toLowerCase()} account',
          style: TextStyle(
            color: accent,
            fontWeight: FontWeight.w700,
            fontSize: 13,
          ),
        ),
      ],
    ),
  );
}

class _ErrorMessage extends StatelessWidget {
  const _ErrorMessage({required this.message});
  final String message;
  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    margin: const EdgeInsets.only(top: 16),
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: AppColors.error.withValues(alpha: .08),
      borderRadius: BorderRadius.circular(12),
    ),
    child: Text(
      message,
      style: const TextStyle(color: AppColors.error, fontSize: 14),
    ),
  );
}
