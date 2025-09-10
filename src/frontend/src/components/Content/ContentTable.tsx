import React from 'react';
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Box,
  Image,
  Text,
  Badge,
  HStack,
  VStack,
  Button,
  Skeleton,
  Tooltip,
  Progress
} from '@chakra-ui/react';
import { StarIcon, CalendarIcon, ViewIcon } from '@chakra-ui/icons';
import { ContentItem } from '../../types/content';
import Pagination from '../Common/Pagination';

interface ContentTableProps {
  data: ContentItem[];
  type: 'movies' | 'series' | 'channels';
  isLoading: boolean;
  onContentClick: (content: ContentItem) => void;
  pagination: {
    current: number;
    total: number;
    onChange: (page: number) => void;
  };
}

const ContentTable: React.FC<ContentTableProps> = ({
  data,
  type,
  isLoading,
  onContentClick,
  pagination
}) => {
  const getQualityColor = (quality: string) => {
    switch (quality?.toLowerCase()) {
      case '4k':
      case 'uhd': return 'purple';
      case 'fhd':
      case '1080p': return 'blue';
      case 'hd':
      case '720p': return 'green';
      case 'sd':
      case '480p': return 'orange';
      default: return 'gray';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'green';
    if (confidence >= 0.6) return 'yellow';
    return 'red';
  };

  if (isLoading) {
    return (
      <Box>
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} height="60px" mb={2} />
        ))}
      </Box>
    );
  }

  return (
    <Box>
      <Table variant="simple" size="md">
        <Thead>
          <Tr>
            <Th width="60px">Imagen</Th>
            <Th>Título</Th>
            {type === 'series' && <Th>T/E</Th>}
            <Th>Año</Th>
            <Th>Género</Th>
            <Th>Calidad</Th>
            <Th>Idioma</Th>
            <Th>Confianza</Th>
            <Th>Rating</Th>
            <Th width="100px">Acciones</Th>
          </Tr>
        </Thead>
        <Tbody>
          {data.map((item) => (
            <Tr key={item.id} _hover={{ bg: 'gray.50' }}>
              <Td>
                <Image
                  src={item.posterUrl || '/placeholder-poster.jpg'}
                  alt={item.title}
                  boxSize="50px"
                  objectFit="cover"
                  borderRadius="md"
                  fallbackSrc="/placeholder-poster.jpg"
                />
              </Td>
              <Td>
                <VStack align="start" spacing={1}>
                  <Text fontWeight="semibold" noOfLines={1}>
                    {item.title}
                  </Text>
                  <Text fontSize="sm" color="gray.500" noOfLines={1}>
                    {item.originalTitle}
                  </Text>
                </VStack>
              </Td>
              {type === 'series' && (
                <Td>
                  <Text fontSize="sm">
                    S{item.season?.toString().padStart(2, '0')} E{item.episode?.toString().padStart(2, '0')}
                  </Text>
                </Td>
              )}
              <Td>
                <HStack>
                  <CalendarIcon color="gray.400" />
                  <Text>{item.year || 'N/A'}</Text>
                </HStack>
              </Td>
              <Td>
                <Text fontSize="sm" noOfLines={1}>
                  {item.genre || 'N/A'}
                </Text>
              </Td>
              <Td>
                <Badge colorScheme={getQualityColor(item.quality)}>
                  {item.quality || 'SD'}
                </Badge>
              </Td>
              <Td>
                <Text fontSize="sm">{item.language || 'N/A'}</Text>
              </Td>
              <Td>
                <Tooltip label={`Confianza: ${(item.confidence * 100).toFixed(1)}%`}>
                  <Box>
                    <Progress
                      value={item.confidence * 100}
                      size="sm"
                      colorScheme={getConfidenceColor(item.confidence)}
                      borderRadius="md"
                    />
                  </Box>
                </Tooltip>
              </Td>
              <Td>
                <HStack>
                  <StarIcon color="yellow.400" />
                  <Text fontSize="sm">
                    {item.rating ? item.rating.toFixed(1) : 'N/A'}
                  </Text>
                </HStack>
              </Td>
              <Td>
                <Button
                  size="sm"
                  leftIcon={<ViewIcon />}
                  onClick={() => onContentClick(item)}
                >
                  Ver
                </Button>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
      
      {data.length === 0 && (
        <Box textAlign="center" py={10}>
          <Text color="gray.500">No se encontró contenido</Text>
        </Box>
      )}
      
      <Box mt={4}>
        <Pagination
          current={pagination.current}
          total={pagination.total}
          onChange={pagination.onChange}
        />
      </Box>
    </Box>
  );
};

export default ContentTable;