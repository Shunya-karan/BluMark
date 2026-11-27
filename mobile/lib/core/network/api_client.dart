import 'dart:developer' as developer;

import 'package:dio/dio.dart';
import '../config/app_config.dart';
import 'api_exception.dart';

class ApiClient {
  static const _diagnosticsEnabled = true;

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

  Future<Map<String, dynamic>> get(
    String path, {
    String? accessToken,
    Map<String, dynamic>? queryParameters,
  }) => _request(
    method: 'GET',
    path: path,
    request: () => dio.get(
      path,
      queryParameters: queryParameters,
      options: _options(accessToken),
    ),
  );

  Future<Map<String, dynamic>> post(
    String path, {
    Object? data,
    String? accessToken,
  }) => _request(
    method: 'POST',
    path: path,
    request: () => dio.post(path, data: data, options: _options(accessToken)),
  );

  Future<Map<String, dynamic>> patch(
    String path, {
    Object? data,
    String? accessToken,
  }) => _request(
    method: 'PATCH',
    path: path,
    request: () => dio.patch(path, data: data, options: _options(accessToken)),
  );
  //
  // Future<Map<String, dynamic>> patch(
  //   String path, {
  //   Object? data,
  //   String? accessToken,
  // }) => _request(
  //   () => dio.patch(path, data: data, options: _options(accessToken)),
  // );

  Future<Map<String, dynamic>> delete(
    String path, {
    Object? data,
    String? accessToken,
  }) => _request(
    method: 'DELETE',
    path: path,
    request: () => dio.delete(path, data: data, options: _options(accessToken)),
  );

  Options _options(String? token) => Options(
    headers: token == null ? null : {'Authorization': 'Bearer $token'},
  );

  Future<Map<String, dynamic>> _request({
    required String method,
    required String path,
    required Future<Response<dynamic>> Function() request,
  }) async {
    final uri = Uri.parse(dio.options.baseUrl).resolve(path);
    final startedAt = DateTime.now();
    _diagnostic(
      '$method request started baseUrl=${dio.options.baseUrl} url=$uri',
    );

    try {
      final response = await request();
      _diagnostic(
        '$method request completed status=${response.statusCode} '
        'elapsedMs=${DateTime.now().difference(startedAt).inMilliseconds}',
      );
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
      final responseMessage = _responseMessage(data);
      _diagnostic(
        '$method request failed type=${error.type.name} '
        'status=${error.response?.statusCode} '
        'elapsedMs=${DateTime.now().difference(startedAt).inMilliseconds} '
        'responseMessage=${responseMessage ?? '<none>'}',
      );
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

  static String? _responseMessage(dynamic data) {
    if (data is Map && data['message'] is String) {
      return data['message'] as String;
    }
    return null;
  }

  static void _diagnostic(String message) {
    if (_diagnosticsEnabled) {
      developer.log(message, name: 'BluMark.ApiClient');
    }
  }
}
