import 'package:dio/dio.dart';
import '../config/app_config.dart';
import 'api_exception.dart';

class ApiClient {
  ApiClient()
      : dio = Dio(
          BaseOptions(
            baseUrl: AppConfig.apiBaseUrl,
            connectTimeout: const Duration(seconds: 12),
            receiveTimeout: const Duration(seconds: 15),
            sendTimeout: const Duration(seconds: 15),
            headers: const {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
          ),
        );

  final Dio dio;

  Future<Map<String, dynamic>> get(String path, {String? accessToken}) =>
      _request(() => dio.get(path, options: _options(accessToken)));

  Future<Map<String, dynamic>> post(
    String path, {
    Object? data,
    String? accessToken,
  }) =>
      _request(
        () => dio.post(path, data: data, options: _options(accessToken)),
      );

  Options _options(String? token) => Options(
        headers: token == null ? null : {'Authorization': 'Bearer $token'},
      );

  Future<Map<String, dynamic>> _request(
    Future<Response<dynamic>> Function() request,
  ) async {
    try {
      final response = await request();
      final body = response.data;
      if (body is Map<String, dynamic> && body['success'] == true) {
        final data = body['data'];
        if (data is Map) {
          return Map<String, dynamic>.from(data);
        }
        return Map<String, dynamic>.from(body);
      }
      throw const ApiException('The server returned an unexpected response.');
    } on DioException catch (error) {
      final data = error.response?.data;
      final message = data is Map && data['message'] is String
          ? data['message'] as String
          : switch (error.type) {
              DioExceptionType.connectionTimeout ||
              DioExceptionType.receiveTimeout ||
              DioExceptionType.sendTimeout =>
                'The request timed out. Please try again.',
              DioExceptionType.connectionError =>
                'Unable to reach the server. Check your connection and try again.',
              _ => 'Something went wrong. Please try again.',
            };
      throw ApiException(message, statusCode: error.response?.statusCode);
    }
  }
}
